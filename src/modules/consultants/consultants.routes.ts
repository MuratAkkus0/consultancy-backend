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

const router = Router();

// List consultants (paginated)
router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  validateQuery(paginationSchema),
  consultantsController.list,
);

// Create a consultant
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validateBody(createConsultantSchema),
  consultantsController.create,
);

// Get a consultant by id
router.get(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  consultantsController.getById,
);

// Edit a consultant by id
router.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  validateBody(editConsultantSchema),
  consultantsController.editById,
);

// Soft-delete a consultant by id (default delete)
router.delete(
  "/:id",
  requireAuth,
  requireSelfOrAdmin,
  requireRole("admin", "consultant"),
  validateParams(uuidParamSchema),
  consultantsController.softDeleteById,
);

// Permanently (hard) delete a consultant by id
router.delete(
  "/:id/permanent",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  consultantsController.hardDeleteById,
);

// Deactivate a consultant (status -> inactive)
router.post(
  "/:id/deactivate",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  consultantsController.inactivateById,
);

// Activate a consultant (status -> active)
router.post(
  "/:id/activate",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  consultantsController.activateById,
);

export default router;
