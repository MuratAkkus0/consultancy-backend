import z from "zod";
import { educationLevelEnum, targetProgramSchema } from "../../db/index.js";

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
  targetEducationLevel: z.enum(educationLevelEnum.enumValues),
  preferedStartDate: z.iso.date().optional(),
  financeSource: z.string().optional(),
  budgetRange: z.string().max(50).optional(),
  appliedVisaBefore: z.boolean().optional(),
  currentlyInVisaProcess: z.boolean().optional(),
  countryOfResidence: z.string(),
  cityOfResidence: z.string().optional(),
  additionalInfo: z.string().optional(),
  isDataProcessingAccepted: z.literal(true),
});
