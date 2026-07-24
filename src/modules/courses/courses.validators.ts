import z from "zod";
import { paginationSchema } from "../../lib/validators.js";

export const createCourseSchema = z.object({
  consultantId: z.uuid().optional(),
  courseName: z.string().trim().min(1).max(200),
  courseDescription: z.string().trim().optional(),
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
  schedule: z.string().trim().optional(),
  level: z.string().trim().optional(),
});

// Admin edits course info. `meetingLink` is intentionally excluded — only the
// owning consultant manages it through its own endpoint.
export const editCourseSchema = z
  .object({
    consultantId: z.uuid(),
    consultantNotes: z.string().trim(),
    courseName: z.string().trim().min(1).max(200),
    courseDescription: z.string().trim(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    schedule: z.string().trim(),
    level: z.string().trim(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const consultantEditCourseSchema = z
  .object({
    meetingLink: z.url(),
    consultantNotes: z.string().trim(),
  })
  .partial();

export const enrollStudentSchema = z.object({
  studentId: z.uuid(),
});

export const courseQuerySchema = paginationSchema.extend({
  consultantId: z.uuid().optional(),
});

export const courseStudentParamsSchema = z.object({
  id: z.uuid(),
  studentId: z.uuid(),
});
