import z from "zod";
import { consultantCertificateSchema, userGenderEnum } from "../../db/index.js";

export const createConsultantSchema = z.object({
  firstName: z.string().trim().min(1).max(40),
  lastName: z.string().trim().min(1).max(40),
  email: z.email(),
  password: z.string().trim().min(12).max(100),
  phone: z.string().trim().max(20).optional(),
  maxActiveStudents: z.number().int().positive().max(100).default(5).optional(),
});

export const editConsultantSchema = z
  .object({
    user: z
      .object({
        firstName: z.string().trim().min(1).max(40),
        lastName: z.string().trim().min(1).max(40),
        email: z.email(),
        phone: z.string().trim().max(20).optional(),
        image: z.string().trim(),
        birthDate: z.date(),
        gender: z.enum(userGenderEnum.enumValues),
        preferredLanguage: z.string().trim(),
      })
      .partial(),
    consultantProfile: z
      .object({
        maxActiveStudents: z.number().int().positive().max(100).default(5),
        bio: z.string().trim(),
        yearsOfExperience: z.number().int().positive(),
        specializations: z.array(z.string().trim()),
        languagesSpoken: z.array(z.string().trim()),
        education: z.string().trim(),
        certifications: z.array(consultantCertificateSchema),
        isAvailable: z.boolean(),
      })
      .partial(),
  })
  .partial()
  .refine(
    (data) =>
      (data.user && Object.keys(data.user).length > 0) ||
      (data.consultantProfile &&
        Object.keys(data.consultantProfile).length > 0),
    { message: "At least one field must be provided." },
  );
