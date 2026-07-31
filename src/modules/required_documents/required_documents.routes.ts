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
import { requiredDocumentsController } from "./required_documents.controller.js";
import {
  createRequiredDocumentSchema,
  requiredDocumentQuerySchema,
} from "./required_documents.validators.js";

const router = Router();

const ADMIN_CONSULTANT_ERRORS = {
  401: { description: "Not authenticated" },
  403: { description: "Admin or consultant role required" },
} as const;

// Assign a required document to a student - admin (any student) or consultant
// (only their assigned students).
registerRoute({
  method: "post",
  path: "/api/v1/required-documents",
  tags: ["Required Documents"],
  summary: "Require a document from a student",
  description:
    "Marks a document type as required for a student. A consultant may only do this for a student assigned to them; an admin for anyone. A type can be required for a student at most once.",
  request: { body: createRequiredDocumentSchema },
  responses: {
    201: { description: "Requirement created" },
    400: { description: "Validation error" },
    404: { description: "Document type not found" },
    409: { description: "This document is already required for the student" },
    ...ADMIN_CONSULTANT_ERRORS,
  },
});
router.post(
  "/",
  requireAuth,
  requireRole("admin", "consultant"),
  validateBody(createRequiredDocumentSchema),
  requiredDocumentsController.create,
);

// List a student's required documents with fulfillment status.
registerRoute({
  method: "get",
  path: "/api/v1/required-documents",
  tags: ["Required Documents"],
  summary: "List a student's required documents",
  description:
    "Requires studentId. Each item includes the document type and a `fulfilled` flag (true when the student has an uploaded document of that type). A consultant is scoped to their assigned students.",
  request: { query: requiredDocumentQuerySchema },
  responses: {
    200: { description: "The student's required documents" },
    ...ADMIN_CONSULTANT_ERRORS,
  },
});
router.get(
  "/",
  requireAuth,
  requireRole("admin", "consultant"),
  validateQuery(requiredDocumentQuerySchema),
  requiredDocumentsController.list,
);

// Remove a requirement - admin any; consultant only for their assigned
// students. Hard delete; re-assigning later is a clean insert.
registerRoute({
  method: "delete",
  path: "/api/v1/required-documents/:id",
  tags: ["Required Documents"],
  summary: "Remove a required document",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Requirement removed" },
    404: { description: "Required document not found" },
    ...ADMIN_CONSULTANT_ERRORS,
  },
});
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin", "consultant"),
  validateParams(uuidParamSchema),
  requiredDocumentsController.removeById,
);

export default router;
