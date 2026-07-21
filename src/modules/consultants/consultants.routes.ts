import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { consultantsController } from "./consultants.controller.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middleware/validate.middleware.js";
import { paginationSchema, uuidParamSchema } from "../../lib/validators.js";
import {
  createConsultantSchema,
  editConsultantSchema,
} from "./consultants.validators.js";
import { requireSelfOrAdmin } from "../../middleware/ownership.middleware.js";
import { registerRoute } from "../../lib/openapi.js";

const router = Router();

const ADMIN_ERRORS = {
  401: { description: "Not authenticated" },
  403: { description: "Admin role required" },
} as const;

const NOT_FOUND = { description: "Consultant not found" };

// List consultants (paginated)
registerRoute({
  method: "get",
  path: "/api/v1/consultants",
  tags: ["Consultants"],
  summary: "List consultants",
  request: { query: paginationSchema },
  responses: { 200: { description: "Paginated list of consultants" }, ...ADMIN_ERRORS },
});
router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  validateQuery(paginationSchema),
  consultantsController.list,
);

// Create a consultant
registerRoute({
  method: "post",
  path: "/api/v1/consultants",
  tags: ["Consultants"],
  summary: "Create a consultant",
  request: { body: createConsultantSchema },
  responses: {
    201: { description: "Consultant created" },
    400: { description: "Validation error" },
    ...ADMIN_ERRORS,
  },
});
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validateBody(createConsultantSchema),
  consultantsController.create,
);

// Get a consultant by id
registerRoute({
  method: "get",
  path: "/api/v1/consultants/:id",
  tags: ["Consultants"],
  summary: "Get a consultant by id",
  request: { params: uuidParamSchema },
  responses: { 200: { description: "The consultant" }, 404: NOT_FOUND, ...ADMIN_ERRORS },
});
router.get(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  consultantsController.getById,
);

// Edit a consultant by id
registerRoute({
  method: "patch",
  path: "/api/v1/consultants/:id",
  tags: ["Consultants"],
  summary: "Edit a consultant by id",
  request: { params: uuidParamSchema, body: editConsultantSchema },
  responses: { 200: { description: "Consultant updated" }, 404: NOT_FOUND, ...ADMIN_ERRORS },
});
router.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  validateBody(editConsultantSchema),
  consultantsController.editById,
);

// Soft-delete a consultant by id (default delete)
registerRoute({
  method: "delete",
  path: "/api/v1/consultants/:id",
  tags: ["Consultants"],
  summary: "Soft-delete a consultant by id",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Consultant soft-deleted" },
    404: NOT_FOUND,
    401: { description: "Not authenticated" },
    403: { description: "Admin, or the consultant themselves, required" },
  },
});
router.delete(
  "/:id",
  requireAuth,
  requireSelfOrAdmin,
  requireRole("admin", "consultant"),
  validateParams(uuidParamSchema),
  consultantsController.softDeleteById,
);

// Permanently (hard) delete a consultant by id
registerRoute({
  method: "delete",
  path: "/api/v1/consultants/:id/permanent",
  tags: ["Consultants"],
  summary: "Permanently delete a consultant by id",
  request: { params: uuidParamSchema },
  responses: { 200: { description: "Consultant permanently deleted" }, 404: NOT_FOUND, ...ADMIN_ERRORS },
});
router.delete(
  "/:id/permanent",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  consultantsController.hardDeleteById,
);

// Deactivate a consultant (status -> inactive)
registerRoute({
  method: "post",
  path: "/api/v1/consultants/:id/deactivate",
  tags: ["Consultants"],
  summary: "Deactivate a consultant",
  request: { params: uuidParamSchema },
  responses: { 200: { description: "Consultant deactivated" }, 404: NOT_FOUND, ...ADMIN_ERRORS },
});
router.post(
  "/:id/deactivate",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  consultantsController.inactivateById,
);

// Activate a consultant (status -> active)
registerRoute({
  method: "post",
  path: "/api/v1/consultants/:id/activate",
  tags: ["Consultants"],
  summary: "Activate a consultant",
  request: { params: uuidParamSchema },
  responses: { 200: { description: "Consultant activated" }, 404: NOT_FOUND, ...ADMIN_ERRORS },
});
router.post(
  "/:id/activate",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  consultantsController.activateById,
);

export default router;
