import z from "zod";
import { applicationStatusEnum } from "../../db/index.js";
import { paginationSchema } from "../../lib/validators.js";

// `monthlySalary` is a numeric column (string in the driver), so the validated
// number is normalised to a 2-decimal string ready for insertion.
const monthlySalarySchema = z
  .number()
  .positive()
  .max(9_999_999)
  .transform((n) => n.toFixed(2));

// The application's own descriptive fields (everything except identity/ownership
// columns id/studentId/consultantId, which are never edited through the body).
const applicationFields = {
  title: z.string().trim().min(1).max(200),
  status: z.enum(applicationStatusEnum.enumValues),
  universityName: z.string().trim().max(200),
  targetProgram: z.string().trim().max(200),
  monthlySalary: monthlySalarySchema,
  websiteLink: z.url(),
  targetCity: z.string().trim().max(100),
  targetState: z.string().trim().max(100),
  programStartDate: z.iso.date(),
  programEndDate: z.iso.date(),
} as const;

// Managed exclusively by the owning consultant (same rule as courses'
// meetingLink) — the admin schemas deliberately exclude it.
const consultantNotesSchema = z.string().trim().max(1000);

const createApplicationFields = {
  studentId: z.uuid(),
  title: applicationFields.title,
  status: applicationFields.status.optional(),
  universityName: applicationFields.universityName.optional(),
  targetProgram: applicationFields.targetProgram.optional(),
  monthlySalary: applicationFields.monthlySalary.optional(),
  websiteLink: applicationFields.websiteLink.optional(),
  targetCity: applicationFields.targetCity.optional(),
  targetState: applicationFields.targetState.optional(),
  programStartDate: applicationFields.programStartDate.optional(),
  programEndDate: applicationFields.programEndDate.optional(),
} as const;

// --- Create ---------------------------------------------------------------
// A consultant files an application for one of their students, so the
// consultant is derived from the session and only `studentId` is supplied.
// An admin acts on anyone's behalf and must name both parties.
export const consultantCreateApplicationSchema = z.object({
  ...createApplicationFields,
  consultantNotes: consultantNotesSchema.optional(),
});

export const adminCreateApplicationSchema = z.object({
  ...createApplicationFields,
  consultantId: z.uuid(),
});

// --- Edit -----------------------------------------------------------------
// `studentId` is intentionally immutable: an application belongs to a specific
// student for its whole life. Only an admin may reassign the consultant.
export const consultantEditApplicationSchema = z
  .object({ ...applicationFields, consultantNotes: consultantNotesSchema })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const editApplicationSchema = z
  .object({ ...applicationFields, consultantId: z.uuid() })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

// --- Query ----------------------------------------------------------------
export const applicationQuerySchema = paginationSchema.extend({
  studentId: z.uuid().optional(),
  consultantId: z.uuid().optional(),
  status: z.enum(applicationStatusEnum.enumValues).optional(),
});

// The student's own view (/me/applications): identity comes from the session,
// so no studentId/consultantId filters here.
export const studentApplicationQuerySchema = paginationSchema.extend({
  status: z.enum(applicationStatusEnum.enumValues).optional(),
});
