import type z from "zod";
import type {
  createRequiredDocumentSchema,
  requiredDocumentQuerySchema,
} from "./required_documents.validators.js";

export type CreateRequiredDocumentDTO = z.infer<
  typeof createRequiredDocumentSchema
>;
export type RequiredDocumentQuery = z.infer<typeof requiredDocumentQuerySchema>;
