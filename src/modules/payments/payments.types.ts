import type z from "zod";
import type {
  createPaymentSchema,
  editPaymentSchema,
  paymentQuerySchema,
  revenueQuerySchema,
  studentPaymentQuerySchema,
} from "./payments.validators.js";

export type CreatePaymentDTO = z.infer<typeof createPaymentSchema>;
export type EditPaymentDTO = z.infer<typeof editPaymentSchema>;
export type PaymentQuery = z.infer<typeof paymentQuerySchema>;
export type StudentPaymentQuery = z.infer<typeof studentPaymentQuerySchema>;
export type RevenueQuery = z.infer<typeof revenueQuerySchema>;
