import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import {
  validateBodyByRole,
  validateParams,
  validateQuery,
} from "../../middleware/validate.middleware.js";
import { uuidParamSchema } from "../../lib/validators.js";
import { registerRoute } from "../../lib/openapi.js";
import { applicationsController } from "./applications.controller.js";
import {
  adminCreateApplicationSchema,
  applicationQuerySchema,
  consultantCreateApplicationSchema,
  consultantEditApplicationSchema,
  editApplicationSchema,
} from "./applications.validators.js";

const router = Router();

const AUTH_ERRORS = {
  401: { description: "Not authenticated" },
} as const;

const ADMIN_ERRORS = {
  ...AUTH_ERRORS,
  403: { description: "Admin role required" },
} as const;

const ADMIN_CONSULTANT_ERRORS = {
  ...AUTH_ERRORS,
  403: { description: "Admin or consultant role required" },
} as const;

// Create an application - Admin (names both parties) or consultant (files under
// their own id for one of their students); the body is validated by role.
registerRoute({
  method: "post",
  path: "/api/v1/applications",
  tags: ["Applications"],
  summary: "Create an application",
  description:
    "An admin supplies both studentId and consultantId. A consultant supplies only studentId and may only file for a student assigned to them; the consultant is taken from the session. consultantNotes is managed exclusively by the owning consultant. The request body is validated by role.",
  request: { body: adminCreateApplicationSchema },
  responses: {
    201: { description: "Application created" },
    400: { description: "Validation error" },
    404: { description: "Student or consultant not found" },
    ...ADMIN_CONSULTANT_ERRORS,
    403: {
      description:
        "Admin or consultant role required, or the student is not assigned to you",
    },
  },
});
router.post(
  "/",
  requireAuth,
  requireRole("admin", "consultant"),
  validateBodyByRole({
    admin: adminCreateApplicationSchema,
    consultant: consultantCreateApplicationSchema,
  }),
  applicationsController.create,
);

// List applications - Admin sees all; a consultant sees only their own.
registerRoute({
  method: "get",
  path: "/api/v1/applications",
  tags: ["Applications"],
  summary: "List applications",
  description:
    "Paginated. Optionally filter by studentId, consultantId or status. A consultant is always scoped to their own applications regardless of the consultantId filter.",
  request: { query: applicationQuerySchema },
  responses: {
    200: { description: "List of applications" },
    ...ADMIN_CONSULTANT_ERRORS,
  },
});
router.get(
  "/",
  requireAuth,
  requireRole("admin", "consultant"),
  validateQuery(applicationQuerySchema),
  applicationsController.list,
);

// Get an application by id - Admin any; a consultant and student only their own.
registerRoute({
  method: "get",
  path: "/api/v1/applications/:id",
  tags: ["Applications"],
  summary: "Get an application by id",
  description:
    "Admin can read any application; a consultant or a student can only read their own. In the student's view the consultant's private notes (consultantNotes) are never included.",
  request: { params: uuidParamSchema },
  responses: {
    200: {
      description:
        "The application with the related parties (student and/or consultant, depending on the role)",
    },
    404: { description: "Application not found" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/:id",
  requireAuth,
  requireRole("admin", "consultant", "student"),
  validateParams(uuidParamSchema),
  applicationsController.getById,
);

// Edit an application - Admin (full, may reassign consultant) or consultant
// (own only, cannot reassign); the body is validated by role.
registerRoute({
  method: "patch",
  path: "/api/v1/applications/:id",
  tags: ["Applications"],
  summary: "Edit an application",
  description:
    "Admin edits any application and may reassign the consultant. A consultant may only edit their own application and cannot change ownership. studentId is immutable; consultantNotes is managed exclusively by the owning consultant. The request body is validated by role.",
  request: { params: uuidParamSchema, body: editApplicationSchema },
  responses: {
    200: { description: "Application updated" },
    400: { description: "Validation error" },
    404: { description: "Application or consultant not found" },
    ...ADMIN_CONSULTANT_ERRORS,
  },
});
router.patch(
  "/:id",
  requireAuth,
  requireRole("admin", "consultant"),
  validateParams(uuidParamSchema),
  validateBodyByRole({
    admin: editApplicationSchema,
    consultant: consultantEditApplicationSchema,
  }),
  applicationsController.editById,
);

// Soft-delete an application - Admin only
registerRoute({
  method: "delete",
  path: "/api/v1/applications/:id",
  tags: ["Applications"],
  summary: "Soft-delete an application",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Application soft-deleted" },
    404: { description: "Application not found" },
    ...ADMIN_ERRORS,
  },
});
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  applicationsController.softDeleteById,
);

// Permanently (hard) delete an application - Admin only
registerRoute({
  method: "delete",
  path: "/api/v1/applications/:id/permanent",
  tags: ["Applications"],
  summary: "Permanently delete an application",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Application permanently deleted" },
    404: { description: "Application not found" },
    ...ADMIN_ERRORS,
  },
});
router.delete(
  "/:id/permanent",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  applicationsController.hardDeleteById,
);

export default router;
