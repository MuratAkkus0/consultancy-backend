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
import { appointmentsController } from "./appointments.controller.js";
import {
  adminCreateAppointmentSchema,
  appointmentQuerySchema,
  consultantCreateAppointmentSchema,
  consultantEditAppointmentSchema,
  editAppointmentSchema,
} from "./appointments.validators.js";

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

// Create an appointment - Admin (names both parties) or consultant (schedules
// with an assigned student under their own id); the body is validated by role.
registerRoute({
  method: "post",
  path: "/api/v1/appointments",
  tags: ["Appointments"],
  summary: "Create an appointment",
  description:
    "An admin supplies both studentId and consultantId. A consultant supplies only studentId and may only schedule with a student assigned to them; the consultant is taken from the session. scheduledAt carries the full date and time and durationMinutes (default 30) defines the booking window [scheduledAt, scheduledAt + durationMinutes) — a consultant cannot hold overlapping appointments. The request body is validated by role.",
  request: { body: adminCreateAppointmentSchema },
  responses: {
    201: { description: "Appointment created" },
    400: { description: "Validation error" },
    404: { description: "Student or consultant not found" },
    409: {
      description: "Consultant already has an appointment in this time range",
    },
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
    admin: adminCreateAppointmentSchema,
    consultant: consultantCreateAppointmentSchema,
  }),
  appointmentsController.create,
);

// List appointments - Admin sees all; a consultant sees only their own.
registerRoute({
  method: "get",
  path: "/api/v1/appointments",
  tags: ["Appointments"],
  summary: "List appointments",
  description:
    "Paginated, ordered by scheduledAt (soonest first). Optionally filter by studentId, consultantId or a datetime range (from/to). A consultant is always scoped to their own appointments regardless of the consultantId filter.",
  request: { query: appointmentQuerySchema },
  responses: {
    200: { description: "List of appointments" },
    ...ADMIN_CONSULTANT_ERRORS,
  },
});
router.get(
  "/",
  requireAuth,
  requireRole("admin", "consultant"),
  validateQuery(appointmentQuerySchema),
  appointmentsController.list,
);

// Get an appointment by id - Admin any; a consultant only their own.
registerRoute({
  method: "get",
  path: "/api/v1/appointments/:id",
  tags: ["Appointments"],
  summary: "Get an appointment by id",
  description:
    "Admin can read any appointment; a consultant can only read their own.",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "The appointment with its student (and consultant)" },
    404: { description: "Appointment not found" },
    ...ADMIN_CONSULTANT_ERRORS,
  },
});
router.get(
  "/:id",
  requireAuth,
  requireRole("admin", "consultant"),
  validateParams(uuidParamSchema),
  appointmentsController.getById,
);

// Edit an appointment - Admin (full, may reassign consultant) or consultant
// (own only, cannot reassign); the body is validated by role.
registerRoute({
  method: "patch",
  path: "/api/v1/appointments/:id",
  tags: ["Appointments"],
  summary: "Edit an appointment",
  description:
    "Admin edits any appointment and may reassign the consultant. A consultant may only edit their own appointment and cannot change ownership. studentId is immutable. The request body is validated by role.",
  request: { params: uuidParamSchema, body: editAppointmentSchema },
  responses: {
    200: { description: "Appointment updated" },
    400: { description: "Validation error" },
    404: { description: "Appointment or consultant not found" },
    409: {
      description: "Consultant already has an appointment in this time range",
    },
    ...ADMIN_CONSULTANT_ERRORS,
  },
});
router.patch(
  "/:id",
  requireAuth,
  requireRole("admin", "consultant"),
  validateParams(uuidParamSchema),
  validateBodyByRole({
    admin: editAppointmentSchema,
    consultant: consultantEditAppointmentSchema,
  }),
  appointmentsController.editById,
);

// Soft-delete an appointment - Admin only
registerRoute({
  method: "delete",
  path: "/api/v1/appointments/:id",
  tags: ["Appointments"],
  summary: "Soft-delete an appointment",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Appointment soft-deleted" },
    404: { description: "Appointment not found" },
    ...ADMIN_ERRORS,
  },
});
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  appointmentsController.softDeleteById,
);

// Permanently (hard) delete an appointment - Admin only
registerRoute({
  method: "delete",
  path: "/api/v1/appointments/:id/permanent",
  tags: ["Appointments"],
  summary: "Permanently delete an appointment",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Appointment permanently deleted" },
    404: { description: "Appointment not found" },
    ...ADMIN_ERRORS,
  },
});
router.delete(
  "/:id/permanent",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  appointmentsController.hardDeleteById,
);

export default router;
