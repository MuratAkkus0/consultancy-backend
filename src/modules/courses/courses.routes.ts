import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import {
  validateBody,
  validateBodyByRole,
  validateParams,
  validateQuery,
} from "../../middleware/validate.middleware.js";
import { uuidParamSchema } from "../../lib/validators.js";
import { registerRoute } from "../../lib/openapi.js";
import { coursesController } from "./courses.controller.js";
import {
  consultantEditCourseSchema,
  courseQuerySchema,
  courseStudentParamsSchema,
  createCourseSchema,
  editCourseSchema,
  enrollStudentSchema,
} from "./courses.validators.js";

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

// Create a course - Admin only
registerRoute({
  method: "post",
  path: "/api/v1/courses",
  tags: ["Courses"],
  summary: "Create a course",
  request: { body: createCourseSchema },
  responses: {
    201: { description: "Course created" },
    400: { description: "Validation error" },
    404: { description: "Consultant not found" },
    ...ADMIN_ERRORS,
  },
});
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validateBody(createCourseSchema),
  coursesController.create,
);

// List courses (paginated, optional consultantId filter) - Admin only
registerRoute({
  method: "get",
  path: "/api/v1/courses",
  tags: ["Courses"],
  summary: "List courses",
  description: "Paginated. Optionally filter by consultantId.",
  request: { query: courseQuerySchema },
  responses: { 200: { description: "List of courses" }, ...ADMIN_ERRORS },
});
router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  validateQuery(courseQuerySchema),
  coursesController.list,
);

// Get a course by id (with consultant and active enrollments)
registerRoute({
  method: "get",
  path: "/api/v1/courses/:id",
  tags: ["Courses"],
  summary: "Get a course by id",
  description:
    "Admin can read any course; a consultant can only read their own courses.",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Course with consultant and active enrollments" },
    404: { description: "Course not found" },
    ...ADMIN_CONSULTANT_ERRORS,
  },
});
router.get(
  "/:id",
  requireAuth,
  requireRole("admin", "consultant"),
  validateParams(uuidParamSchema),
  coursesController.getById,
);

// Edit course info - Admin (full info) or consultant (own meeting link / notes)
registerRoute({
  method: "patch",
  path: "/api/v1/courses/:id",
  tags: ["Courses"],
  summary: "Edit a course",
  description:
    "Admin edits full course info. A consultant may only edit meetingLink and consultantNotes on their own course; the request body is validated by role.",
  request: { params: uuidParamSchema, body: editCourseSchema },
  responses: {
    200: { description: "Course updated" },
    400: { description: "Validation error" },
    404: { description: "Course not found" },
    ...ADMIN_CONSULTANT_ERRORS,
  },
});
router.patch(
  "/:id",
  requireAuth,
  requireRole("admin", "consultant"),
  validateParams(uuidParamSchema),
  validateBodyByRole({
    admin: editCourseSchema,
    consultant: consultantEditCourseSchema,
  }),
  coursesController.editById,
);

// Soft-delete a course - Admin only
registerRoute({
  method: "delete",
  path: "/api/v1/courses/:id",
  tags: ["Courses"],
  summary: "Soft-delete a course",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Course soft-deleted" },
    404: { description: "Course not found" },
    ...ADMIN_ERRORS,
  },
});
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  coursesController.softDeleteById,
);

// Permanently (hard) delete a course - Admin only
registerRoute({
  method: "delete",
  path: "/api/v1/courses/:id/permanent",
  tags: ["Courses"],
  summary: "Permanently delete a course",
  description: "Cascades to the course's enrollments.",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Course permanently deleted" },
    404: { description: "Course not found" },
    ...ADMIN_ERRORS,
  },
});
router.delete(
  "/:id/permanent",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  coursesController.hardDeleteById,
);

// Enroll a student into a course - Admin only
registerRoute({
  method: "post",
  path: "/api/v1/courses/:id/enrollments",
  tags: ["Courses"],
  summary: "Enroll a student into a course",
  request: { params: uuidParamSchema, body: enrollStudentSchema },
  responses: {
    201: { description: "Student enrolled" },
    400: { description: "Validation error" },
    404: { description: "Course or student not found" },
    409: { description: "Student is already enrolled in this course" },
    ...ADMIN_ERRORS,
  },
});
router.post(
  "/:id/enrollments",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  validateBody(enrollStudentSchema),
  coursesController.enrollStudent,
);

// Unenroll a student from a course (soft delete) - Admin only
registerRoute({
  method: "delete",
  path: "/api/v1/courses/:id/enrollments/:studentId",
  tags: ["Courses"],
  summary: "Unenroll a student from a course",
  request: { params: courseStudentParamsSchema },
  responses: {
    200: { description: "Student unenrolled" },
    404: { description: "Enrollment not found" },
    ...ADMIN_ERRORS,
  },
});
router.delete(
  "/:id/enrollments/:studentId",
  requireAuth,
  requireRole("admin"),
  validateParams(courseStudentParamsSchema),
  coursesController.unenrollStudent,
);

export default router;
