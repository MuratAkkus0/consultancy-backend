import z from "zod";

// A consultant/admin marks one document type as required for one student.
export const createRequiredDocumentSchema = z.object({
  studentId: z.uuid(),
  documentTypeId: z.uuid(),
  note: z.string().trim().max(500).optional(),
});

// Required documents only make sense per student, so studentId is required.
export const requiredDocumentQuerySchema = z.object({
  studentId: z.uuid(),
});
