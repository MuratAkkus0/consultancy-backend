import type z from "zod";
import type {
  editAdminSelfSchema,
  editConsultantSelfSchema,
  editStudentSelfSchema,
} from "./me.validators.js";

export type EditStudentSelfDTO = z.infer<typeof editStudentSelfSchema>;
export type EditConsultantSelfDTO = z.infer<typeof editConsultantSelfSchema>;
export type EditAdminSelfDTO = z.infer<typeof editAdminSelfSchema>;

export type EditSelfDTO =
  | EditStudentSelfDTO
  | EditConsultantSelfDTO
  | EditAdminSelfDTO;
