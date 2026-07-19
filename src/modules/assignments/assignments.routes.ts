import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { assignmentsController } from "./assignments.controller.js";
import { requireRole } from "../../middleware/role.middleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middleware/validate.middleware.js";
import {
  adminEditAssignmentSchema,
  assignmentQuerySchema,
  assignStudentToConsultantSchema,
} from "./assignments.validators.js";
import { uuidParamSchema } from "../../lib/validators.js";

const router = Router();

// Assign student to consultant - Admin only
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validateBody(assignStudentToConsultantSchema),
  assignmentsController.assignStudentToConsultant,
);

// Get consultant's or student's assignments
router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  validateQuery(assignmentQuerySchema),
  assignmentsController.list,
);

// Edit assignment
router.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  validateBody(adminEditAssignmentSchema),
  assignmentsController.editById,
);

// Soft Delete assignment
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  assignmentsController.softDeleteById,
);

// Hard Delete assignment
router.delete(
  "/:id/permanent",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  assignmentsController.hardDeleteById,
);

export default router;
