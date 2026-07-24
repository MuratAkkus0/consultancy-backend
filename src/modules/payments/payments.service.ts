import { and, asc, desc, eq, isNull, sql, type SQL } from "drizzle-orm";
import createHttpError from "http-errors";
import { db, paymentsTable } from "../../db/index.js";
import { userIdentityColumns } from "../../db/selections.js";
import type {
  CreatePaymentDTO,
  EditPaymentDTO,
  PaymentQuery,
  RevenueQuery,
  StudentPaymentQuery,
} from "./payments.types.js";

const sortColumns = {
  paidAt: paymentsTable.paidAt,
  amount: paymentsTable.amount,
  createdAt: paymentsTable.createdAt,
} as const;

export const paymentsService = {
  create: async (data: CreatePaymentDTO, recordedById: string) => {
    const student = await db.query.users.findFirst({
      where: (table, { eq, and }) =>
        and(
          eq(table.id, data.studentId),
          eq(table.role, "student"),
          eq(table.status, "active"),
        ),
      columns: { id: true },
    });

    if (!student) {
      throw createHttpError(404, "Student not found.");
    }

    const [payment] = await db
      .insert(paymentsTable)
      .values({ ...data, recordedById })
      .returning();

    return payment;
  },

  list: async (params: PaymentQuery) => {
    const { page, limit, studentId, sortBy, order } = params;
    const offset = (page - 1) * limit;

    const where = studentId
      ? and(
          isNull(paymentsTable.deletedAt),
          eq(paymentsTable.studentId, studentId),
        )
      : isNull(paymentsTable.deletedAt);

    const sortColumn = sortColumns[sortBy];
    const orderBy = order === "asc" ? asc(sortColumn) : desc(sortColumn);

    const [data, total] = await Promise.all([
      db.query.paymentsTable.findMany({
        limit,
        offset,
        where,
        orderBy,
        with: {
          student: { columns: userIdentityColumns },
        },
      }),
      db.$count(paymentsTable, where),
    ]);

    return { data, total };
  },

  listForStudent: async (studentId: string, params: StudentPaymentQuery) => {
    const { page, limit, sortBy, order } = params;
    const offset = (page - 1) * limit;

    const where = and(
      isNull(paymentsTable.deletedAt),
      eq(paymentsTable.studentId, studentId),
    );

    const sortColumn = sortColumns[sortBy];
    const orderBy = order === "asc" ? asc(sortColumn) : desc(sortColumn);

    const [data, total] = await Promise.all([
      db.query.paymentsTable.findMany({
        limit,
        offset,
        where,
        orderBy,

        columns: {
          recordedById: false,
          note: false,
        },
      }),
      db.$count(paymentsTable, where),
    ]);

    return { data, total };
  },

  getById: async (id: string) => {
    const payment = await db.query.paymentsTable.findFirst({
      where: and(eq(paymentsTable.id, id), isNull(paymentsTable.deletedAt)),
      with: {
        student: { columns: userIdentityColumns },
      },
    });

    if (!payment) {
      throw createHttpError(404, "Payment not found.");
    }

    return payment;
  },

  editById: async (id: string, data: EditPaymentDTO) => {
    const [payment] = await db
      .update(paymentsTable)
      .set(data)
      .where(and(eq(paymentsTable.id, id), isNull(paymentsTable.deletedAt)))
      .returning();

    if (!payment) {
      throw createHttpError(404, "Payment not found.");
    }

    return payment;
  },

  softDeleteById: async (id: string) => {
    const [payment] = await db
      .update(paymentsTable)
      .set({ deletedAt: new Date() })
      .where(and(eq(paymentsTable.id, id), isNull(paymentsTable.deletedAt)))
      .returning();

    if (!payment) {
      throw createHttpError(404, "Payment not found.");
    }

    return payment;
  },

  // Revenue grouped by month or year (for the admin dashboard).
  revenue: async ({ period, year }: RevenueQuery) => {
    const truncUnit = period === "year" ? "year" : "month";
    const fmt = period === "year" ? "YYYY" : "YYYY-MM";
    const bucket = sql<string>`to_char(date_trunc(${truncUnit}, ${paymentsTable.paidAt}), ${fmt})`;

    const conditions: SQL[] = [isNull(paymentsTable.deletedAt)];
    if (year !== undefined) {
      conditions.push(
        sql`extract(year from ${paymentsTable.paidAt}) = ${year}`,
      );
    }

    const rows = await db
      .select({
        period: bucket,
        total: sql<string>`coalesce(sum(${paymentsTable.amount}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(paymentsTable)
      .where(and(...conditions))
      .groupBy(bucket)
      .orderBy(bucket);

    return rows.map((row) => ({
      period: row.period,
      total: Number(row.total),
      count: row.count,
    }));
  },
};
