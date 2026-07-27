import type z from "zod";
import type {
  createDocumentSchema,
  documentQuerySchema,
  myDocumentQuerySchema,
  reviewDocumentSchema,
} from "./documents.validators.js";

export type CreateDocumentDTO = z.infer<typeof createDocumentSchema>;
export type ReviewDocumentDTO = z.infer<typeof reviewDocumentSchema>;
export type MyDocumentQuery = z.infer<typeof myDocumentQuerySchema>;
export type DocumentQuery = z.infer<typeof documentQuerySchema>;
