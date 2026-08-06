import z from "zod";
import { documentReviewStatusEnum } from "../../db/index.js";
import { paginationSchema } from "../../lib/validators.js";

// The declared size is an upper bound for early rejection; a presigned PUT
// cannot enforce the real size, so this is the client's claim, not a fact.
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Allowlist, not a free string: the value is signed into the S3 upload URL,
// and which formats we accept is a product rule that should be visible here.
const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

// --- Create (upload intent) -------------------------------------------------
// The file itself never reaches this API: the client declares the metadata,
// gets a presigned URL back and uploads directly to S3. documentTypeId is only
// checked for shape here; whether it exists (and is active) is the service's
// job, since the list lives in the document_types table, not in code.
export const createDocumentSchema = z.object({
  documentName: z.string().trim().min(1).max(255),
  documentTypeId: z.uuid(),
  mimeType: z.enum(ALLOWED_DOCUMENT_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_DOCUMENT_SIZE_BYTES),
});

// A consultant uploads into a specific assigned student's area, so the target
// student is named in the body (the /me variant takes it from the session).
export const consultantCreateDocumentSchema = createDocumentSchema.extend({
  studentId: z.uuid(),
});

// --- Review (consultant) ----------------------------------------------------
// "pending" is deliberately not offered: it is the initial state, a review
// decision can only move the document forward to accepted or rejected.
export const reviewDocumentSchema = z.object({
  reviewStatus: z.enum(documentReviewStatusEnum.enumValues).exclude(["pending"]),
});

// --- Query -------------------------------------------------------------------
// The student's own list (/me/documents): the owner comes from the session.
export const myDocumentQuerySchema = paginationSchema.extend({
  documentTypeId: z.uuid().optional(),
});

// The consultant/admin list (/documents): documents only make sense per
// student, so studentId is required, not an optional filter.
export const documentQuerySchema = myDocumentQuerySchema.extend({
  studentId: z.uuid(),
});
