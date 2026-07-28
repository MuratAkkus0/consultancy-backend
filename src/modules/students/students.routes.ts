import { Router } from "express";
import {
  requireAuth,
  requireRole,
  validateParams,
  validateQuery,
} from "../../middleware/index.js";
import { paginationSchema, uuidParamSchema } from "../../lib/validators.js";
import { registerRoute } from "../../lib/openapi.js";
import { studentsController } from "./students.controller.js";

const router = Router();

const ADMIN_ERRORS = {
  401: { description: "Not authenticated" },
  403: { description: "Admin role required" },
} as const;

const NOT_FOUND = { description: "Student not found" };

registerRoute({
  method: "get",
  path: "/api/v1/students",
  tags: ["Students"],
  summary: "List students",
  request: { query: paginationSchema },
  responses: {
    200: { description: "Paginated list of students" },
    401: { description: "Not authenticated" },
    403: { description: "Insufficient role" },
  },
});
router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  validateQuery(paginationSchema),
  studentsController.list,
);

registerRoute({
  method: "get",
  path: "/api/v1/students/:id",
  tags: ["Students"],
  summary: "Get a student by id",
  description:
    "An admin gets any student; a consultant only gets a student actively assigned to them (anything else is a 404).",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "The student" },
    401: { description: "Not authenticated" },
    403: { description: "Admin or consultant role required" },
    404: { description: "Student not found" },
  },
});
router.get(
  "/:id",
  requireAuth,
  requireRole("admin", "consultant"),
  validateParams(uuidParamSchema),
  studentsController.getById,
);

// Soft-delete a student by id (default delete)
registerRoute({
  method: "delete",
  path: "/api/v1/students/:id",
  tags: ["Students"],
  summary: "Soft-delete a student by id",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Student soft-deleted" },
    404: NOT_FOUND,
    401: { description: "Not authenticated" },
    403: { description: "Admin required" },
  },
});
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  studentsController.softDeleteById,
);

// Permanently (hard) delete a student by id
registerRoute({
  method: "delete",
  path: "/api/v1/students/:id/permanent",
  tags: ["Students"],
  summary: "Permanently delete a student by id",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Student permanently deleted" },
    404: NOT_FOUND,
    ...ADMIN_ERRORS,
  },
});
router.delete(
  "/:id/permanent",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  studentsController.hardDeleteById,
);

// Deactivate a student (status -> inactive)
registerRoute({
  method: "post",
  path: "/api/v1/students/:id/deactivate",
  tags: ["Students"],
  summary: "Deactivate a student",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Student deactivated" },
    404: NOT_FOUND,
    ...ADMIN_ERRORS,
  },
});
router.post(
  "/:id/deactivate",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  studentsController.inactivateById,
);

// Activate a student (status -> active)
registerRoute({
  method: "post",
  path: "/api/v1/students/:id/activate",
  tags: ["Students"],
  summary: "Activate a student",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Student activated" },
    404: NOT_FOUND,
    ...ADMIN_ERRORS,
  },
});
router.post(
  "/:id/activate",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  studentsController.activateById,
);

export default router;
