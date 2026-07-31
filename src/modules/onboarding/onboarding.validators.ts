import z from "zod";
import {
  educationLevelEnum,
  languageLevelEnum,
  targetProgramSchema,
} from "../../db/index.js";

export const createOnboardingSchema = z.object({
  nationality: z.string(),
  hasGreenPassport: z.boolean().optional(),
  passportNumber: z.string().optional(),
  currentEducationLevel: z.enum(educationLevelEnum.enumValues),
  lastGraduatedEducationLevel: z.enum(educationLevelEnum.enumValues).optional(),
  currentSchool: z.string().optional(),
  currentFieldOfStudy: z.string().optional(),
  graduationYear: z.int().optional(),
  gpa: z.coerce.number().min(0).max(4).multipleOf(0.01).optional(),
  targetPrograms: z.array(targetProgramSchema).default([]),
  languages: z
    .array(
      z.object({
        languageId: z.uuid(),
        level: z.enum(languageLevelEnum.enumValues),
        certificates: z.array(z.string()).default([]),
      }),
    )
    .default([])
    .refine(
      (arr) => new Set(arr.map((l) => l.languageId)).size === arr.length,
      { message: "Duplicate language." },
    ),
  targetCountries: z
    .array(
      z.object({
        countryId: z.uuid(),
        priority: z.int().optional(),
        notes: z.string().optional(),
      }),
    )
    .default([])
    .refine(
      (arr) => new Set(arr.map((c) => c.countryId)).size === arr.length,
      { message: "Duplicate country." },
    ),
  targetEducationLevel: z.enum(educationLevelEnum.enumValues),
  preferedStartDate: z.iso.date().optional(),
  financeSource: z.string().optional(),
  budgetRange: z.string().max(50).optional(),
  appliedVisaBefore: z.boolean().optional(),
  currentlyInVisaProcess: z.boolean().optional(),
  passportValidity: z.iso.date().optional(),
  schengenEntry: z.boolean().optional(),
  lastSchengenEntryDate: z.iso.date().optional(),
  schengen90DaysUsed: z.boolean().optional(),
  previousAbroadExperience: z.string().max(1000).optional(),
  visaRejectionReason: z.string().max(1000).optional(),
  countryOfResidence: z.string(),
  cityOfResidence: z.string().optional(),
  additionalInfo: z.string().optional(),
  isDataProcessingAccepted: z.literal(true),
});
