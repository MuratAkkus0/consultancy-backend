import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { timestamps } from "./_shared.js";

export const invoiceTypeEnum = pgEnum("invoice_type", ["income", "expense"]);

// Same lifecycle as documents (pending until the direct-to-S3 upload is
// confirmed), but a separate enum so the two features can evolve independently.
export const invoiceUploadStatusEnum = pgEnum("invoice_upload_status", [
  "pending",
  "uploaded",
]);

// Business invoices of the agency: income = issued by us, expense = a cost we
// received. The table is soft-deleted (deletedAt), but invoice_number stays
// globally unique across deleted rows on purpose: a number must never be reused.
export const invoicesTable = pgTable(
  "invoices",
  {
    id: uuid().defaultRandom().primaryKey(),
    type: invoiceTypeEnum("type").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    // Required for income (see the check below), optional for expense.
    // Postgres treats NULLs as distinct, so many number-less expenses are fine.
    invoiceNumber: varchar("invoice_number", { length: 100 }).unique(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
    // The date printed on the invoice; reporting filters use this, not createdAt.
    invoiceDate: timestamp("invoice_date", { withTimezone: true }).notNull(),
    // S3 object key. Server-generated, never exposed in API responses.
    fileKey: text("file_key").notNull().unique(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadStatus: invoiceUploadStatusEnum("upload_status")
      .notNull()
      .default("pending"),
    // Admin who created the record. Kept for audit; the FK has no cascade, so
    // it blocks hard-deleting that user rather than dropping the invoice.
    createdById: uuid("created_by_id").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    index("invoices_invoice_date_idx").on(t.invoiceDate),
    index("invoices_type_idx").on(t.type),
    check(
      "invoices_income_requires_number_chk",
      sql`${t.type} <> 'income' OR ${t.invoiceNumber} IS NOT NULL`,
    ),
  ],
);

export const invoicesRelations = relations(invoicesTable, ({ one }) => ({
  createdBy: one(users, {
    fields: [invoicesTable.createdById],
    references: [users.id],
  }),
}));
