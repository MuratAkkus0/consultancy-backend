import type z from "zod";
import type {
  adminEditAssignmentSchema,
  assignmentQuerySchema,
  assignStudentToConsultantSchema,
  studentEditAssignmentSchema,
} from "./assignments.validators.js";

export type AssignStudentToConsultantDTO = z.infer<
  typeof assignStudentToConsultantSchema
>;

export type AdminEditAssignmentDTO = z.infer<typeof adminEditAssignmentSchema>;
export type StudentEditAssignmentDTO = z.infer<
  typeof studentEditAssignmentSchema
>;

export type AssignmentQuery = z.infer<typeof assignmentQuerySchema>;
