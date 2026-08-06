import z from "zod";
import type {
  userGenderEnum,
  userRoleEnum,
  users,
  userStatusEnum,
} from "./schema/auth.js";
import type { languageLevelEnum } from "./schema/student_languages.js";
import { educationLevelEnum } from "./schema/student_profiles.js";
import type { consentTypeEnum } from "./schema/user_consents.js";
import type { coursesTable } from "./schema/courses.js";
import type { paymentStatusEnum } from "./schema/payments.js";
import type {
  applicationsTable,
  applicationStatusEnum,
} from "./schema/applications.js";
import type { db } from "./db.js";

export type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

// Language
export type LanguageLevel = (typeof languageLevelEnum.enumValues)[number];

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

// --- Student CV sections (stored as validated JSONB on student_profiles) ---
// Month precision is enough for a CV timeline; "2026-08".
const yearMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");

export const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string(),
  startDate: yearMonth,
  endDate: yearMonth.nullish(), // null/absent while ongoing
  gpa: z.number().optional(),
  description: z.string().optional(),
});

export const experienceSchema = z.object({
  company: z.string(),
  position: z.string(),
  location: z.string().optional(),
  startDate: yearMonth,
  endDate: yearMonth.nullish(), // null/absent when `current` is true
  current: z.boolean(),
  description: z.string().optional(),
});

export const skillSchema = z.object({
  name: z.string(),
  level: z.int().min(1).max(5),
});

export const certificateSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  date: yearMonth,
  url: z.url().optional(),
});

export const referenceSchema = z.object({
  name: z.string(),
  title: z.string(),
  company: z.string().optional(),
  email: z.email().optional(),
  phone: z.string().optional(),
});

export type Education = z.infer<typeof educationSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Certificate = z.infer<typeof certificateSchema>;
export type Reference = z.infer<typeof referenceSchema>;

// Course
export type Course = typeof coursesTable.$inferSelect;

// Payments
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];

// Application
export type ApplicationStatus =
  (typeof applicationStatusEnum.enumValues)[number];
export type Application = typeof applicationsTable.$inferSelect;
