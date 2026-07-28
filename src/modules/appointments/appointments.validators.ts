import z from "zod";
import { paginationSchema } from "../../lib/validators.js";
import { appointmentTypeEnum } from "../../db/index.js";

// The appointment's own descriptive fields (everything except identity/ownership
// columns id/studentId/consultantId, which are never edited through the body).
const appointmentFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000),
  appointmentType: z.enum(appointmentTypeEnum.enumValues),
  meetingLink: z.url(),
  // Full date AND time (ISO datetime, e.g. "2026-08-01T14:30:00Z").
  scheduledAt: z.coerce.date(),
  // Length of the booking window; the slot is [scheduledAt, +durationMinutes).
  durationMinutes: z.int().min(5).max(480),
} as const;

// --- Create ---------------------------------------------------------------
// A consultant schedules an appointment with one of their students, so the
// consultant is derived from the session and only `studentId` is supplied.
// An admin acts on anyone's behalf and must name both parties.
export const consultantCreateAppointmentSchema = z.object({
  studentId: z.uuid(),
  title: appointmentFields.title,
  scheduledAt: appointmentFields.scheduledAt,
  durationMinutes: appointmentFields.durationMinutes.default(30),
  description: appointmentFields.description.optional(),
  appointmentType: z.enum(appointmentTypeEnum.enumValues),
  meetingLink: appointmentFields.meetingLink.optional(),
});

export const adminCreateAppointmentSchema =
  consultantCreateAppointmentSchema.extend({
    consultantId: z.uuid(),
  });

// --- Edit -----------------------------------------------------------------
// `studentId` is intentionally immutable: an appointment belongs to a specific
// student for its whole life. Only an admin may reassign the consultant.
export const consultantEditAppointmentSchema = z
  .object(appointmentFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const editAppointmentSchema = z
  .object({ ...appointmentFields, consultantId: z.uuid() })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

// --- Query ----------------------------------------------------------------
export const appointmentQuerySchema = paginationSchema.extend({
  studentId: z.uuid().optional(),
  consultantId: z.uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// The student's own view (/me/appointments): identity comes from the session,
// so no studentId/consultantId filters here.
export const studentAppointmentQuerySchema = paginationSchema.extend({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
