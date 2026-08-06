import { Router } from "express";
import {
  requireAuth,
  requireRole,
  validateBody,
  validateParams,
  validateQuery,
} from "../../middleware/index.js";
import { uuidParamSchema } from "../../lib/validators.js";
import { registerRoute } from "../../lib/openapi.js";
import { documentsController } from "./documents.controller.js";
import {
  consultantCreateDocumentSchema,
  documentQuerySchema,
  reviewDocumentSchema,
} from "./documents.validators.js";

const router = Router();

const AUTH_ERRORS = {
  401: { description: "Not authenticated" },
} as const;

// Start an upload into an assigned student's area - consultant only. Mirrors
// the student's /me/documents intent: the file goes straight to S3 via the
// returned presigned URL; the record stays "pending" until confirmed.
registerRoute({
  method: "post",
  path: "/api/v1/documents",
  tags: ["Documents"],
  summary: "Upload a document for an assigned student",
  description:
    "A consultant declares a file (studentId, type, name, mime, size) for a student actively assigned to them and gets back { document, uploadUrl }. The client PUTs the file to uploadUrl and then confirms. Unassigned or unknown students are a 404.",
  request: { body: consultantCreateDocumentSchema },
  responses: {
    201: { description: "{ document, uploadUrl }" },
    400: { description: "Validation error" },
    403: { description: "Consultant role required" },
    404: { description: "Student or document type not found" },
    ...AUTH_ERRORS,
  },
});
router.post(
  "/",
  requireAuth,
  requireRole("consultant"),
  validateBody(consultantCreateDocumentSchema),
  documentsController.create,
);

// Confirm the upload to S3 succeeded - consultant only, scoped to their own
// students' documents. Verified against S3; idempotent.
registerRoute({
  method: "post",
  path: "/api/v1/documents/:id/confirm",
  tags: ["Documents"],
  summary: "Confirm a document upload",
  description:
    "Marks the document as uploaded after verifying the object exists in storage. Only documents of the consultant's own students are reachable. Idempotent.",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "The confirmed document" },
    404: { description: "Document not found" },
    409: { description: "The file has not been uploaded yet" },
    403: { description: "Consultant role required" },
    ...AUTH_ERRORS,
  },
});
router.post(
  "/:id/confirm",
  requireAuth,
  requireRole("consultant"),
  validateParams(uuidParamSchema),
  documentsController.confirm,
);

// List a student's documents - admin sees all statuses; a consultant sees
// only uploaded documents of students assigned to them.
registerRoute({
  method: "get",
  path: "/api/v1/documents",
  tags: ["Documents"],
  summary: "List a student's documents",
  description:
    "Requires studentId. An admin sees every non-deleted document including pending ones; a consultant sees only uploaded documents and only for students actively assigned to them (otherwise the list is empty). Optionally filter by documentTypeId.",
  request: { query: documentQuerySchema },
  responses: {
    200: { description: "Paginated list of the student's documents" },
    403: { description: "Admin or consultant role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/",
  requireAuth,
  requireRole("admin", "consultant"),
  validateQuery(documentQuerySchema),
  documentsController.list,
);

// Get a short-lived download URL - admin any; consultant only for assigned
// students' uploaded documents.
registerRoute({
  method: "get",
  path: "/api/v1/documents/:id/download-url",
  tags: ["Documents"],
  summary: "Get a download URL for a document",
  description:
    "Returns a short-lived presigned URL for the file. Only uploaded documents are downloadable; a consultant can only reach documents of students assigned to them.",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "{ url } — expires in a few minutes" },
    403: { description: "Admin or consultant role required" },
    404: { description: "Document not found" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/:id/download-url",
  requireAuth,
  requireRole("admin", "consultant"),
  validateParams(uuidParamSchema),
  documentsController.getDownloadUrl,
);

// Review a document - the assigned consultant accepts or rejects it.
registerRoute({
  method: "patch",
  path: "/api/v1/documents/:id/review",
  tags: ["Documents"],
  summary: "Review a document",
  description:
    "The assigned consultant accepts or rejects an uploaded document. Only uploaded, non-deleted documents of the consultant's own students can be reviewed.",
  request: { params: uuidParamSchema, body: reviewDocumentSchema },
  responses: {
    200: { description: "Document with the updated review status" },
    400: { description: "Validation error" },
    403: { description: "Consultant role required" },
    404: { description: "Document not found" },
    ...AUTH_ERRORS,
  },
});
router.patch(
  "/:id/review",
  requireAuth,
  requireRole("consultant"),
  validateParams(uuidParamSchema),
  validateBody(reviewDocumentSchema),
  documentsController.reviewById,
);

// Soft-delete a document - admin (any document) or a consultant (only a
// document they uploaded, for a student still assigned to them).
registerRoute({
  method: "delete",
  path: "/api/v1/documents/:id",
  tags: ["Documents"],
  summary: "Soft-delete a document",
  description:
    "The S3 object is kept; only the record is hidden. An admin can delete any document; a consultant can delete only a document they uploaded for one of their currently assigned students (anything else is a 404).",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Document soft-deleted" },
    403: { description: "Admin or consultant role required" },
    404: { description: "Document not found" },
    ...AUTH_ERRORS,
  },
});
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin", "consultant"),
  validateParams(uuidParamSchema),
  documentsController.softDeleteById,
);

// Permanently delete a document - admin only. Removes the S3 object too.
registerRoute({
  method: "delete",
  path: "/api/v1/documents/:id/permanent",
  tags: ["Documents"],
  summary: "Permanently delete a document",
  description: "Deletes the record and the underlying S3 object.",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Document permanently deleted" },
    403: { description: "Admin role required" },
    404: { description: "Document not found" },
    ...AUTH_ERRORS,
  },
});
router.delete(
  "/:id/permanent",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  documentsController.hardDeleteById,
);

export default router;
