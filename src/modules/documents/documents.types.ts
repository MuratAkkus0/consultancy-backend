import type z from "zod";
import type {
  consultantCreateDocumentSchema,
  createDocumentSchema,
  documentQuerySchema,
  myDocumentQuerySchema,
  reviewDocumentSchema,
} from "./documents.validators.js";

export type CreateDocumentDTO = z.infer<typeof createDocumentSchema>;
export type ConsultantCreateDocumentDTO = z.infer<
  typeof consultantCreateDocumentSchema
>;
export type ReviewDocumentDTO = z.infer<typeof reviewDocumentSchema>;
export type MyDocumentQuery = z.infer<typeof myDocumentQuerySchema>;
export type DocumentQuery = z.infer<typeof documentQuerySchema>;
