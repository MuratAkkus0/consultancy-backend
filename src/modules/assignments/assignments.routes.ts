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
import { registerRoute } from "../../lib/openapi.js";

const router = Router();

const ADMIN_ERRORS = {
  401: { description: "Not authenticated" },
  403: { description: "Admin role required" },
} as const;

// Assign student to consultant - Admin only
registerRoute({
  method: "post",
  path: "/api/v1/assignments",
  tags: ["Assignments"],
  summary: "Assign a student to a consultant",
  request: { body: assignStudentToConsultantSchema },
  responses: {
    201: { description: "Assignment created" },
    400: { description: "Validation error" },
    ...ADMIN_ERRORS,
  },
});
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validateBody(assignStudentToConsultantSchema),
  assignmentsController.assignStudentToConsultant,
);

// Get consultant's or student's assignments
registerRoute({
  method: "get",
  path: "/api/v1/assignments",
  tags: ["Assignments"],
  summary: "List assignments",
  request: { query: assignmentQuerySchema },
  responses: { 200: { description: "List of assignments" }, ...ADMIN_ERRORS },
});
router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  validateQuery(assignmentQuerySchema),
  assignmentsController.list,
);

// Edit assignment
registerRoute({
  method: "patch",
  path: "/api/v1/assignments/:id",
  tags: ["Assignments"],
  summary: "Edit an assignment",
  request: { params: uuidParamSchema, body: adminEditAssignmentSchema },
  responses: {
    200: { description: "Assignment updated" },
    404: { description: "Assignment not found" },
    ...ADMIN_ERRORS,
  },
});
router.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  validateBody(adminEditAssignmentSchema),
  assignmentsController.editById,
);

// Soft Delete assignment
registerRoute({
  method: "delete",
  path: "/api/v1/assignments/:id",
  tags: ["Assignments"],
  summary: "Soft-delete an assignment",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Assignment soft-deleted" },
    404: { description: "Assignment not found" },
    ...ADMIN_ERRORS,
  },
});
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  assignmentsController.softDeleteById,
);

// Hard Delete assignment
registerRoute({
  method: "delete",
  path: "/api/v1/assignments/:id/permanent",
  tags: ["Assignments"],
  summary: "Permanently delete an assignment",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Assignment permanently deleted" },
    404: { description: "Assignment not found" },
    ...ADMIN_ERRORS,
  },
});
router.delete(
  "/:id/permanent",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  assignmentsController.hardDeleteById,
);

export default router;
