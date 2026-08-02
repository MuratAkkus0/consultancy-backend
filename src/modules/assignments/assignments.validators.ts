import z from "zod";

export const assignStudentToConsultantSchema = z.object({
  consultantId: z.uuid(),
  studentId: z.uuid(),
  studentFeedback: z.string().trim().optional(),
  adminNotes: z.string().trim().optional(),
  consultantNotes: z.array(z.string().trim()).optional(),
});

export const adminEditAssignmentSchema = z
  .object({
    studentFeedback: z.string().trim(),
    adminNotes: z.string().trim(),
    consultantNotes: z.array(z.string().trim()).optional(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const consultantEditAssignmentSchema = z.object({
  consultantNotes: z.array(z.string().trim().min(1)),
});

export const studentEditAssignmentSchema = z.object({
  studentFeedback: z.string().trim().min(1),
});

export const assignmentQuerySchema = z.union([
  z.object({
    consultantId: z.uuid(),
  }),
  z.object({
    studentId: z.uuid(),
  }),
]);
