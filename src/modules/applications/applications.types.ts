import type z from "zod";
import type {
  adminCreateApplicationSchema,
  applicationQuerySchema,
  consultantCreateApplicationSchema,
  consultantEditApplicationSchema,
  editApplicationSchema,
  studentApplicationQuerySchema,
} from "./applications.validators.js";

export type CreateApplicationDTO = z.infer<typeof adminCreateApplicationSchema>;
export type ConsultantCreateApplicationDTO = z.infer<
  typeof consultantCreateApplicationSchema
>;
export type EditApplicationDTO = z.infer<typeof editApplicationSchema>;
export type ConsultantEditApplicationDTO = z.infer<
  typeof consultantEditApplicationSchema
>;
export type ApplicationQuery = z.infer<typeof applicationQuerySchema>;
export type StudentApplicationQuery = z.infer<
  typeof studentApplicationQuerySchema
>;
