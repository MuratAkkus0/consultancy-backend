import z from "zod";

export const assignStudentToConsultantSchema = z.object({
  consultantId: z.uuid(),
  studentId: z.uuid(),
  studentFeedback: z.string().trim().optional(),
  adminNotes: z.string().trim().optional(),
});

export const adminEditAssignmentSchema = z
  .object({
    studentFeedback: z.string().trim(),
    adminNotes: z.string().trim(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const studentEditAssignmentSchema = z.object({
  studentId: z.uuid(),
  studentFeedback: z.string().trim().optional(),
});

export const assignmentQuerySchema = z.union([
  z.object({
    consultantId: z.uuid(),
  }),
  z.object({
    studentId: z.uuid(),
  }),
]);
