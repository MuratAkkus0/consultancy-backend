import type z from "zod";
import type {
  adminCreateAppointmentSchema,
  appointmentQuerySchema,
  consultantCreateAppointmentSchema,
  consultantEditAppointmentSchema,
  editAppointmentSchema,
  studentAppointmentQuerySchema,
} from "./appointments.validators.js";

export type CreateAppointmentDTO = z.infer<typeof adminCreateAppointmentSchema>;
export type ConsultantCreateAppointmentDTO = z.infer<
  typeof consultantCreateAppointmentSchema
>;
export type EditAppointmentDTO = z.infer<typeof editAppointmentSchema>;
export type ConsultantEditAppointmentDTO = z.infer<
  typeof consultantEditAppointmentSchema
>;
export type AppointmentQuery = z.infer<typeof appointmentQuerySchema>;
export type StudentAppointmentQuery = z.infer<
  typeof studentAppointmentQuerySchema
>;
