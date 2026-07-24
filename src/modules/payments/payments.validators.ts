import z from "zod";
import { paymentMethodEnum } from "../../db/index.js";
import { paginationSchema } from "../../lib/validators.js";

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

export const createPaymentSchema = z.object({
  studentId: z.uuid(),
  amount: amountSchema,
  currency: currencySchema.optional(),
  method: z.enum(paymentMethodEnum.enumValues).optional(),
  note: z.string().trim().max(1000).optional(),
  paidAt: z.coerce.date().optional(),
});

export const editPaymentSchema = z
  .object({
    amount: amountSchema,
    currency: currencySchema,
    method: z.enum(paymentMethodEnum.enumValues),
    note: z.string().trim().max(1000),
    paidAt: z.coerce.date(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const paymentQuerySchema = paginationSchema.extend({
  studentId: z.uuid().optional(),
  sortBy: z.enum(["paidAt", "amount", "createdAt"]).default("paidAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const studentPaymentQuerySchema = paginationSchema.extend({
  sortBy: z.enum(["paidAt", "amount", "createdAt"]).default("paidAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const revenueQuerySchema = z.object({
  period: z.enum(["month", "year"]).default("month"),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
