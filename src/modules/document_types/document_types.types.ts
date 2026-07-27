import type z from "zod";
import type {
  createDocumentTypeSchema,
  editDocumentTypeSchema,
} from "./document_types.validators.js";

export type CreateDocumentTypeDTO = z.infer<typeof createDocumentTypeSchema>;
export type EditDocumentTypeDTO = z.infer<typeof editDocumentTypeSchema>;
