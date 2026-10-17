import type z from "zod";
import type {
  createInvoiceSchema,
  editInvoiceSchema,
  invoiceQuerySchema,
} from "./invoices.validators.js";

export type CreateInvoiceDTO = z.infer<typeof createInvoiceSchema>;
export type EditInvoiceDTO = z.infer<typeof editInvoiceSchema>;
export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;
