import { Router } from "express";
import {
  requireAuth,
  requireRole,
  validateBody,
  validateParams,
} from "../../middleware/index.js";
import { uuidParamSchema } from "../../lib/validators.js";
import { registerRoute } from "../../lib/openapi.js";
import { documentTypesController } from "./document_types.controller.js";
import {
  createDocumentTypeSchema,
  editDocumentTypeSchema,
} from "./document_types.validators.js";

const router = Router();

const AUTH_ERRORS = {
  401: { description: "Not authenticated" },
} as const;

const ADMIN_ERRORS = {
  ...AUTH_ERRORS,
  403: { description: "Admin role required" },
} as const;

// List document types - any authenticated user (students need the list to
// pick a type when uploading).
registerRoute({
  method: "get",
  path: "/api/v1/document-types",
  tags: ["Document Types"],
  summary: "List document types",
  description: "The active document type vocabulary, ordered by name.",
  responses: {
    200: { description: "List of document types" },
    ...AUTH_ERRORS,
  },
});
router.get("/", requireAuth, documentTypesController.list);

// Create a document type - admin only.
registerRoute({
  method: "post",
  path: "/api/v1/document-types",
  tags: ["Document Types"],
  summary: "Create a document type",
  description:
    "code is the stable machine name (lowercase snake_case, unique, immutable); name is the human label.",
  request: { body: createDocumentTypeSchema },
  responses: {
    201: { description: "Document type created" },
    400: { description: "Validation error" },
    409: { description: "A document type with this code already exists" },
    ...ADMIN_ERRORS,
  },
});
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validateBody(createDocumentTypeSchema),
  documentTypesController.create,
);

// Rename a document type - admin only; code is immutable.
registerRoute({
  method: "patch",
  path: "/api/v1/document-types/:id",
  tags: ["Document Types"],
  summary: "Rename a document type",
  request: { params: uuidParamSchema, body: editDocumentTypeSchema },
  responses: {
    200: { description: "Document type updated" },
    400: { description: "Validation error" },
    404: { description: "Document type not found" },
    ...ADMIN_ERRORS,
  },
});
router.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  validateBody(editDocumentTypeSchema),
  documentTypesController.editById,
);

// Soft-delete (stop offering) a document type - admin only. Existing
// documents keep referencing it; new uploads can no longer use it.
registerRoute({
  method: "delete",
  path: "/api/v1/document-types/:id",
  tags: ["Document Types"],
  summary: "Soft-delete a document type",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Document type soft-deleted" },
    404: { description: "Document type not found" },
    ...ADMIN_ERRORS,
  },
});
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  documentTypesController.softDeleteById,
);

export default router;
