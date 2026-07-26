import z from "zod";
import type {
  userGenderEnum,
  userRoleEnum,
  users,
  userStatusEnum,
} from "./schema/auth.js";
import type { languageLevel } from "./schema/student_languages.js";
import { educationLevelEnum } from "./schema/student_profiles.js";
import type { consentTypeEnum } from "./schema/user_consents.js";
import type { coursesTable } from "./schema/courses.js";
import type { paymentStatusEnum } from "./schema/payments.js";
import type {
  applicationsTable,
  applicationStatusEnum,
} from "./schema/applications.js";

// Language
export type LanguageLevel = (typeof languageLevel.enumValues)[number];

// User
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type UserStatus = (typeof userStatusEnum.enumValues)[number];
export type UserGender = (typeof userGenderEnum.enumValues)[number];

// Consent
export type ConsentType = (typeof consentTypeEnum.enumValues)[number];

// Student
export type EducationLevel = (typeof educationLevelEnum.enumValues)[number];

export const targetProgramSchema = z.object({
  country: z.string(),
  university: z.string(),
  program: z.string(),
  degreeLevel: z.enum(educationLevelEnum.enumValues),
  intakeTerm: z.string(),
  state: z.string().optional(),
  city: z.string().optional(),
  priority: z.int().optional(),
  estimatedDeadline: z.iso.date().optional(),
  estimatedTuition: z
    .object({
      amount: z.number(),
      currency: z.string(),
    })
    .optional(),
  websiteUrl: z.url().optional(),
  notes: z.string().optional(),
});

export const consultantCertificateSchema = z.object({
  name: z.string(),
  description: z.string(),
  certifyingAuthority: z.string(),
  dateOfIssuance: z.iso.date(), // "2024-01-15" (YYYY-MM-DD)
});

export type ConsultantCertificate = z.infer<typeof consultantCertificateSchema>;
export type TargetProgram = z.infer<typeof targetProgramSchema>;

// Course
export type Course = typeof coursesTable.$inferSelect;

// Payments
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];

// Application
export type ApplicationStatus =
  (typeof applicationStatusEnum.enumValues)[number];
export type Application = typeof applicationsTable.$inferSelect;
