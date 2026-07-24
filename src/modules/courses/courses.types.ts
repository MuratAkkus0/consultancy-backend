import type z from "zod";
import type {
  consultantEditCourseSchema,
  courseQuerySchema,
  createCourseSchema,
  editCourseSchema,
  enrollStudentSchema,
} from "./courses.validators.js";

export type CreateCourseDTO = z.infer<typeof createCourseSchema>;
export type EditCourseDTO = z.infer<typeof editCourseSchema>;
export type ConsultantEditCourseDTO = z.infer<
  typeof consultantEditCourseSchema
>;
export type EnrollStudentDTO = z.infer<typeof enrollStudentSchema>;
export type CourseQuery = z.infer<typeof courseQuerySchema>;
