import z from "zod";
import { educationLevelEnum, userGenderEnum } from "../../db/index.js";
import {
  consultantCertificateSchema,
  targetProgramSchema,
} from "../../db/types.js";

// Fields on the `users` table that a user is allowed to change about itself.
// Deliberately excludes email, role and status (privileged / identity fields).
const userSelfFields = z
  .object({
    firstName: z.string().trim().min(1).max(40),
    lastName: z.string().trim().min(1).max(40),
    phone: z.string().trim().max(20),
    image: z.url(),
    birthDate: z.coerce.date(),
    gender: z.enum(userGenderEnum.enumValues),
    preferredLanguage: z.string().trim().max(10),
    timezone: z.string().trim().max(50),
  })
  .partial();

const atLeastOneGroup = (data: Record<string, unknown>) =>
  Object.values(data).some(
    (group) =>
      group !== undefined &&
      typeof group === "object" &&
      group !== null &&
      Object.keys(group).length > 0,
  );

export const editStudentSelfSchema = z
  .object({
    user: userSelfFields,
    studentProfile: z
      .object({
        nationality: z.string().trim().max(50),
        hasGreenPassport: z.boolean(),
        passportNumber: z.string().trim().max(50),
        currentEducationLevel: z.enum(educationLevelEnum.enumValues),
        lastGraduatedEducationLevel: z.enum(educationLevelEnum.enumValues),
        currentSchool: z.string().trim().max(200),
        currentFieldOfStudy: z.string().trim(),
        graduationYear: z.number().int().min(1950).max(2100),
        // `gpa` is stored as a numeric column (string in the DB driver);
        // accept a number from the client and normalise to a 2-decimal string.
        gpa: z
          .number()
          .min(0)
          .max(4)
          .transform((n) => n.toFixed(2)),
        targetPrograms: z.array(targetProgramSchema),
        targetEducationLevel: z.enum(educationLevelEnum.enumValues),
        preferedStartDate: z.iso.date(),
        financeSource: z.string().trim(),
        budgetRange: z.string().trim().max(50),
        appliedVisaBefore: z.boolean(),
        currentlyInVisaProcess: z.boolean(),
        countryOfResidence: z.string().trim(),
        cityOfResidence: z.string().trim(),
        additionalInfo: z.string().trim(),
      })
      .partial(),
  })
  .partial()
  .refine(atLeastOneGroup, {
    message: "At least one field must be provided.",
  });

export const editConsultantSelfSchema = z
  .object({
    user: userSelfFields,
    consultantProfile: z
      .object({
        bio: z.string().trim(),
        yearsOfExperience: z.number().int().min(0).max(80),
        specializations: z.array(z.string().trim()),
        languagesSpoken: z.array(z.string().trim()),
        education: z.string().trim(),
        certifications: z.array(consultantCertificateSchema),
        // A consultant may toggle its own availability, but never its
        // capacity (`maxActiveStudents`) — that is an admin decision.
        isAvailable: z.boolean(),
      })
      .partial(),
  })
  .partial()
  .refine(atLeastOneGroup, {
    message: "At least one field must be provided.",
  });

export const editAdminSelfSchema = z
  .object({
    user: userSelfFields,
    adminProfile: z
      .object({
        notes: z.array(z.string().trim()),
      })
      .partial(),
  })
  .partial()
  .refine(atLeastOneGroup, {
    message: "At least one field must be provided.",
  });
