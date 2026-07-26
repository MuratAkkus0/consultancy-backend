import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { meController } from "./me.controller.js";
import {
  validateBodyByRole,
  validateQuery,
} from "../../middleware/validate.middleware.js";
import {
  editAdminSelfSchema,
  editConsultantSelfSchema,
  editStudentSelfSchema,
} from "./me.validators.js";
import { paginationSchema } from "../../lib/validators.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { studentPaymentQuerySchema } from "../payments/payments.validators.js";
import { studentApplicationQuerySchema } from "../applications/applications.validators.js";
import { studentAppointmentQuerySchema } from "../appointments/appointments.validators.js";
import { registerRoute } from "../../lib/openapi.js";

const router = Router();

const AUTH_ERRORS = {
  401: { description: "Not authenticated" },
} as const;

// Get the authenticated user's own profile (id comes from the session)
registerRoute({
  method: "get",
  path: "/api/v1/me",
  tags: ["Me"],
  summary: "Get my profile",
  description: "Returns the authenticated user with its role-specific profile.",
  responses: {
    200: { description: "The authenticated user's profile" },
    404: { description: "User not found" },
    ...AUTH_ERRORS,
  },
});
router.get("/", requireAuth, meController.getProfile);

// Update the authenticated user's own profile. The body schema is chosen
// from the session role, so a student, consultant and admin each get their
// own set of editable fields.
registerRoute({
  method: "patch",
  path: "/api/v1/me",
  tags: ["Me"],
  summary: "Update my profile",
  description:
    "Updates the authenticated user's own fields. The request body is validated by role: a student, consultant and admin each get their own editable set (email, role and status are never editable here).",
  request: { body: editStudentSelfSchema },
  responses: {
    200: { description: "Updated profile" },
    400: { description: "Validation error" },
    ...AUTH_ERRORS,
  },
});
router.patch(
  "/",
  requireAuth,
  validateBodyByRole({
    student: editStudentSelfSchema,
    consultant: editConsultantSelfSchema,
    admin: editAdminSelfSchema,
  }),
  meController.editProfile,
);

// Get the authenticated user's own courses
registerRoute({
  method: "get",
  path: "/api/v1/me/courses",
  tags: ["Me"],
  summary: "List my courses",
  description:
    "A student gets the courses they are enrolled in; a consultant gets the courses they own.",
  request: { query: paginationSchema },
  responses: {
    200: { description: "The authenticated user's courses" },
    403: { description: "Student or consultant role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/courses",
  requireAuth,
  requireRole("student", "consultant"),
  validateQuery(paginationSchema),
  meController.getCourses,
);

// Get the authenticated user's own payments
registerRoute({
  method: "get",
  path: "/api/v1/me/payments",
  tags: ["Me"],
  summary: "List my payments",
  description: "Returns only the authenticated student's own payments.",
  request: { query: studentPaymentQuerySchema },
  responses: {
    200: { description: "The authenticated student's payments" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/payments",
  requireAuth,
  requireRole("student"),
  validateQuery(studentPaymentQuerySchema),
  meController.getPayments,
);

// Get the authenticated student's own applications
registerRoute({
  method: "get",
  path: "/api/v1/me/applications",
  tags: ["Me"],
  summary: "List my applications",
  description:
    "Returns only the authenticated student's own applications with the consultant's identity. Optionally filter by status. The consultant's private notes are never included.",
  request: { query: studentApplicationQuerySchema },
  responses: {
    200: { description: "The authenticated student's applications" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/applications",
  requireAuth,
  requireRole("student"),
  validateQuery(studentApplicationQuerySchema),
  meController.getApplications,
);

// Get the authenticated student's own appointments
registerRoute({
  method: "get",
  path: "/api/v1/me/appointments",
  tags: ["Me"],
  summary: "List my appointments",
  description:
    "Returns only the authenticated student's own appointments with the consultant's identity, ordered by scheduledAt (soonest first). Optionally filter by a datetime range (from/to).",
  request: { query: studentAppointmentQuerySchema },
  responses: {
    200: { description: "The authenticated student's appointments" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/appointments",
  requireAuth,
  requireRole("student"),
  validateQuery(studentAppointmentQuerySchema),
  meController.getAppointments,
);

// Get the students assigned to the authenticated consultant
registerRoute({
  method: "get",
  path: "/api/v1/me/assignments",
  tags: ["Me"],
  summary: "List my assigned students",
  description:
    "Returns the authenticated consultant's active assignments. Each item is the assignment record (id, createdAt) with the assigned student embedded.",
  request: { query: paginationSchema },
  responses: {
    200: { description: "The authenticated consultant's assignments" },
    403: { description: "Consultant role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/assignments",
  requireAuth,
  requireRole("consultant"),
  validateQuery(paginationSchema),
  meController.getAssignments,
);

// Get the consultant assigned to the authenticated student
registerRoute({
  method: "get",
  path: "/api/v1/me/consultant",
  tags: ["Me"],
  summary: "Get my consultant",
  description:
    "Returns the authenticated student's active assignment (id, createdAt) with the assigned consultant embedded, or null when no consultant is assigned.",
  responses: {
    200: { description: "The authenticated student's consultant, or null" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/consultant",
  requireAuth,
  requireRole("student"),
  meController.getConsultant,
);

export default router;
