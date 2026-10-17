import z from "zod";
import { invoiceTypeEnum } from "../../db/schema/invoices.js";
import { paginationSchema } from "../../lib/validators.js";

// The declared size is the client's claim, not a fact: a presigned PUT cannot
// enforce the real size. Same early-rejection bound as documents.
const MAX_INVOICE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// `amount` is a numeric column (string in the driver), so the validated value
// is normalised to a 2-decimal string ready for insertion.
const amountSchema = z
  .number()
  .positive()
  .max(99_999_999)
  .transform((n) => n.toFixed(2));

const currencySchema = z
  .string()
  .trim()
  .length(3)
  .transform((c) => c.toUpperCase());

// A blank number is "no number": otherwise "" (or "  ") would satisfy the
// income-requires-number rule and then collide with every other blank.
const blankToUndefined = (v: string) => (v === "" ? undefined : v);
const blankToNull = (v: string) => (v === "" ? null : v);

const invoiceNumberSchema = z.string().trim().max(100);

const INCOME_NUMBER_ISSUE = {
  message: "An income invoice requires an invoice number.",
  path: ["invoiceNumber"] as string[],
};

export const createInvoiceSchema = z
  .object({
    type: z.enum(invoiceTypeEnum.enumValues),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    invoiceNumber: invoiceNumberSchema.transform(blankToUndefined).optional(),
    amount: amountSchema,
    currency: currencySchema.default("EUR"),
    invoiceDate: z.coerce.date(),
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.literal("application/pdf"),
    sizeBytes: z.number().int().positive().max(MAX_INVOICE_SIZE_BYTES),
  })
  .refine(
    (d) => d.type !== "income" || d.invoiceNumber !== undefined,
    INCOME_NUMBER_ISSUE,
  );

// The file is not replaceable here, so file fields are absent. invoiceNumber
// may be cleared (null) for expenses; the income invariant on the merged row
// (stored type + patch) is re-checked by the service.
export const editInvoiceSchema = z
  .object({
    type: z.enum(invoiceTypeEnum.enumValues),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable(),
    invoiceNumber: invoiceNumberSchema.transform(blankToNull).nullable(),
    amount: amountSchema,
    currency: currencySchema,
    invoiceDate: z.coerce.date(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  })
  .refine(
    (d) => !(d.type === "income" && d.invoiceNumber === null),
    INCOME_NUMBER_ISSUE,
  );

export const invoiceQuerySchema = paginationSchema
  .extend({
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    type: z.enum(invoiceTypeEnum.enumValues).optional(),
  })
  .refine((q) => q.month === undefined || q.year !== undefined, {
    message: "month can only be used together with year.",
    path: ["month"],
  });
