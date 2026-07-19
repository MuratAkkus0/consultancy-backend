import type z from "zod";
import type {
  createConsultantSchema,
  editConsultantSchema,
} from "./consultants.validators.js";

export type CreateConsultantDTO = z.infer<typeof createConsultantSchema>;
export type EditConsultantDTO = z.infer<typeof editConsultantSchema>;
