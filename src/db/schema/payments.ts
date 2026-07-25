import {
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./auth.js";
import { timestamps } from "./_shared.js";

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "bank_transfer",
  "credit_card",
  "other",
]);

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid"]);

// Payments are recorded manually by an admin. The table is soft-deleted - (deletedAt)
export const paymentsTable = pgTable("payments", {
  id: uuid().defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("TRY"),
  method: paymentMethodEnum("method"),
  note: text("note"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  status: paymentStatusEnum("status").default("pending").notNull(),
  // Admin who recorded the payment. Kept for audit; nulled if that user is
  // hard-deleted so the payment record survives.
  recordedById: uuid("recorded_by_id").references(() => users.id),
  ...timestamps,
});

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  student: one(users, {
    fields: [paymentsTable.studentId],
    references: [users.id],
  }),
}));
