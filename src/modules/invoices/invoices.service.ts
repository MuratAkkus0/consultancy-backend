import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, isNull, lt, sql, type SQL } from "drizzle-orm";
import createHttpError from "http-errors";
import { db, invoicesTable } from "../../db/index.js";
import {
  addS3DocumentsToDeletionQueue,
  isUniqueViolation,
} from "../../lib/service-helpers.js";
import { storage, URL_TTL_SECONDS } from "../../lib/storage.js";
import {
  buildInvoiceKey,
  INCOME_NUMBER_CHECK,
  INVOICE_TIME_ZONE,
  periodRange,
  violatedConstraint,
  type CivilMonth,
} from "./invoices.helpers.js";
import type {
  CreateInvoiceDTO,
  EditInvoiceDTO,
  InvoiceQuery,
} from "./invoices.types.js";

// Strips the storage address (fileKey) before a row leaves the service.
const toResponse = <T extends { fileKey: string }>(invoice: T) => {
  const { fileKey: _key, ...rest } = invoice;
  return rest;
};

const isDuplicateNumber = (err: unknown) =>
  isUniqueViolation(err) &&
  (violatedConstraint(err) ?? "").includes("invoice_number");

const INCOME_NUMBER_MESSAGE = "An income invoice requires an invoice number.";

// Lost race against another edit: the pre-check passed but the DB check
// constraint still fired.
const isIncomeNumberCheckViolation = (err: unknown) =>
  violatedConstraint(err) === INCOME_NUMBER_CHECK;

const duplicateNumberError = (invoiceNumber: string) =>
  createHttpError(409, `Invoice number "${invoiceNumber}" already exists.`);

// A pending, live row at this point is necessarily within its upload window
// (older ones were just recycled), so say so instead of "already exists".
const createConflictError = async (invoiceNumber: string) => {
  const existing = await db.query.invoicesTable.findFirst({
    where: eq(invoicesTable.invoiceNumber, invoiceNumber),
    columns: { uploadStatus: true, deletedAt: true },
  });
  if (existing?.uploadStatus === "pending" && existing.deletedAt === null) {
    return createHttpError(
      409,
      `An upload for invoice number "${invoiceNumber}" is already in progress. Try again in a few minutes.`,
    );
  }
  return duplicateNumberError(invoiceNumber);
};

const notFound = () => createHttpError(404, "Invoice not found.");

const activeScope = (id: string) =>
  and(eq(invoicesTable.id, id), isNull(invoicesTable.deletedAt));

// Berlin-local month start -> instant, resolved by Postgres so DST is right.
const berlinMonthStart = ({ year, month }: CivilMonth) =>
  sql`make_timestamp(${year}::int, ${month}::int, 1, 0, 0, 0) AT TIME ZONE ${INVOICE_TIME_ZONE}`;

export const invoicesService = {
  // Step 1 of the upload flow: create the row as "pending" and hand back a
  // short-lived URL the client PUTs the PDF to. The key is server-generated.
  create: async (data: CreateInvoiceDTO, createdById: string) => {
    const id = randomUUID();
    const fileKey = buildInvoiceKey(data.invoiceDate, id);

    // invoice_number is unique across all rows, so an abandoned upload (still
    // pending, never confirmed) would block a retry forever. Such a row is
    // replaced, but only once its presigned URL has expired: before that the
    // upload may still complete, and a double-submit must not wipe the first
    // request's row. Uploaded or soft-deleted rows keep their number reserved.
    const uploadWindowEnd = new Date(Date.now() - URL_TTL_SECONDS * 1000);
    const invoice = await db
      .transaction(async (tx) => {
        if (data.invoiceNumber) {
          const abandoned = await tx
            .delete(invoicesTable)
            .where(
              and(
                eq(invoicesTable.invoiceNumber, data.invoiceNumber),
                eq(invoicesTable.uploadStatus, "pending"),
                isNull(invoicesTable.deletedAt),
                lt(invoicesTable.createdAt, uploadWindowEnd),
              ),
            )
            .returning({ fileKey: invoicesTable.fileKey });

          // The object may have been partially uploaded before abandonment.
          await addS3DocumentsToDeletionQueue(
            abandoned.map((row) => row.fileKey),
            tx,
          );
        }

        const [row] = await tx
          .insert(invoicesTable)
          .values({ ...data, id, fileKey, createdById })
          .returning();
        return row!;
      })
      .catch(async (err: unknown) => {
        if (data.invoiceNumber && isDuplicateNumber(err)) {
          throw await createConflictError(data.invoiceNumber);
        }
        throw err;
      });

    const uploadUrl = await storage.getUploadUrl(fileKey, data.mimeType);

    return { invoice: toResponse(invoice), uploadUrl };
  },

  // Step 2: verified against S3, idempotent.
  confirmUpload: async (id: string) => {
    const scope = activeScope(id);
    const invoice = await db.query.invoicesTable.findFirst({ where: scope });

    if (!invoice) {
      throw notFound();
    }

    if (invoice.uploadStatus === "uploaded") {
      return toResponse(invoice);
    }

    const exists = await storage.objectExists(invoice.fileKey);
    if (!exists) {
      throw createHttpError(409, "The file has not been uploaded yet.");
    }

    const [updated] = await db
      .update(invoicesTable)
      .set({ uploadStatus: "uploaded" })
      .where(and(scope, eq(invoicesTable.uploadStatus, "pending")))
      .returning();

    // 0 rows - someone already confirmed it. Idempotent.
    if (!updated) {
      return toResponse({ ...invoice, uploadStatus: "uploaded" as const });
    }

    return toResponse(updated);
  },

  list: async (params: InvoiceQuery) => {
    const { page, limit, year, month, type } = params;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [
      isNull(invoicesTable.deletedAt),
      eq(invoicesTable.uploadStatus, "uploaded"),
    ];
    if (type) {
      conditions.push(eq(invoicesTable.type, type));
    }
    if (year !== undefined) {
      // Half-open range on the raw column so the invoice_date index is usable.
      const { from, to } = periodRange(year, month);
      conditions.push(
        gte(invoicesTable.invoiceDate, berlinMonthStart(from)),
        lt(invoicesTable.invoiceDate, berlinMonthStart(to)),
      );
    }
    const where = and(...conditions);

    const [data, total, summary] = await Promise.all([
      db.query.invoicesTable.findMany({
        limit,
        offset,
        where,
        orderBy: [desc(invoicesTable.invoiceDate), desc(invoicesTable.id)],
        columns: { fileKey: false },
      }),
      db.$count(invoicesTable, where),
      // Totals cover the whole filtered set, not just the current page. Grouped
      // by currency because amounts in different currencies cannot be summed.
      db
        .select({
          currency: invoicesTable.currency,
          incomeTotal: sql<string>`coalesce(sum(${invoicesTable.amount}) filter (where ${invoicesTable.type} = 'income'), 0)::numeric(14,2)::text`,
          expenseTotal: sql<string>`coalesce(sum(${invoicesTable.amount}) filter (where ${invoicesTable.type} = 'expense'), 0)::numeric(14,2)::text`,
        })
        .from(invoicesTable)
        .where(where)
        .groupBy(invoicesTable.currency)
        .orderBy(invoicesTable.currency),
    ]);

    return { data, total, summary };
  },

  getById: async (id: string) => {
    const invoice = await db.query.invoicesTable.findFirst({
      where: activeScope(id),
      columns: { fileKey: false },
    });

    if (!invoice) {
      throw notFound();
    }

    return invoice;
  },

  getDownloadUrl: async (id: string) => {
    const invoice = await db.query.invoicesTable.findFirst({
      where: activeScope(id),
    });

    if (invoice?.uploadStatus !== "uploaded") {
      throw notFound();
    }

    const url = await storage.getDownloadUrl(invoice.fileKey, invoice.fileName);
    return { url };
  },

  editById: async (id: string, data: EditInvoiceDTO) => {
    // The income-requires-number rule must hold for the merged result, which
    // the validator cannot see (e.g. type -> income on a number-less expense).
    const current = await db.query.invoicesTable.findFirst({
      where: activeScope(id),
      columns: { type: true, invoiceNumber: true },
    });

    if (!current) {
      throw notFound();
    }

    const type = data.type ?? current.type;
    const invoiceNumber =
      data.invoiceNumber !== undefined
        ? data.invoiceNumber
        : current.invoiceNumber;

    if (type === "income" && invoiceNumber === null) {
      throw createHttpError(
        400,
        "An income invoice requires an invoice number.",
      );
    }

    try {
      const [invoice] = await db
        .update(invoicesTable)
        .set(data)
        .where(activeScope(id))
        .returning();

      if (!invoice) {
        throw notFound();
      }

      return toResponse(invoice);
    } catch (err) {
      if (data.invoiceNumber && isDuplicateNumber(err)) {
        throw duplicateNumberError(data.invoiceNumber);
      }
      if (isIncomeNumberCheckViolation(err)) {
        throw createHttpError(400, INCOME_NUMBER_MESSAGE);
      }
      throw err;
    }
  },

  // The number stays reserved after deletion (global unique constraint): an
  // invoice number must never be reused. The S3 object is kept as well.
  softDeleteById: async (id: string) => {
    const [invoice] = await db
      .update(invoicesTable)
      .set({ deletedAt: new Date() })
      .where(activeScope(id))
      .returning();

    if (!invoice) {
      throw notFound();
    }

    return toResponse(invoice);
  },
};
