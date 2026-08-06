import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./auth.js";
import { timestamps } from "./_shared.js";
import { studentTargetCountriesTable } from "./student_target_countries.js";
import { studentLanguagesTable } from "./student_languages.js";
import type {
  Certificate,
  Education,
  Experience,
  Reference,
  Skill,
  TargetProgram,
} from "../types.js";

export const educationLevelEnum = pgEnum("education_level", [
  "primary",
  "secondary",
  "high_school",
  "associate",
  "apprentice",
  "bachelor",
  "master",
  "doctorate",
]);

export const maritalStatusEnum = pgEnum("marital_status", [
  "single",
  "married",
  "divorced",
  "widowed",
]);

export const studentProfilesTable = pgTable("student_profiles", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  nationality: varchar({ length: 50 }),
  hasGreenPassport: boolean("has_green_passport"),
  passportNumber: varchar("passport_number", { length: 50 }),
  currentEducationLevel: educationLevelEnum("current_education_level"),
  lastGraduatedEducationLevel: educationLevelEnum(
    "last_graduated_education_level",
  ),
  currentSchool: varchar("current_school", { length: 200 }),
  currentFieldOfStudy: text("current_field_of_study"),
  graduationYear: integer("graduation_year"),
  gpa: numeric({ precision: 4, scale: 2 }),
  targetPrograms: jsonb("target_programs")
    .$type<TargetProgram[]>()
    .notNull()
    .default([]),
  targetEducationLevel: educationLevelEnum("target_education_level"),
  preferedStartDate: date("prefered_start_date"),
  financeSource: text("finance_source"),
  budgetRange: varchar("budget_range", { length: 50 }),
  appliedVisaBefore: boolean("applied_visa_before"),
  currentlyInVisaProcess: boolean("currently_in_visa_process"),
  passportValidity: date("passport_validity"),
  schengenEntry: boolean("schengen_entry"),
  lastSchengenEntryDate: date("last_schengen_entry_date"),
  schengen90DaysUsed: boolean("schengen_90_days_used"),
  previousAbroadExperience: text("previous_abroad_experience"),
  visaRejectionReason: text("visa_rejection_reason"),
  countryOfResidence: text("country_of_residence"),
  cityOfResidence: text("city_of_residence"),
  additionalInfo: text("additional_info"),
  isDataProcessingAccepted: boolean("is_data_processing_accepted"),
  // --- CV sections (validated JSONB, like targetPrograms) ---
  educations: jsonb("educations").$type<Education[]>().notNull().default([]),
  experiences: jsonb("experiences").$type<Experience[]>().notNull().default([]),
  skills: jsonb("skills").$type<Skill[]>().notNull().default([]),
  certificates: jsonb("certificates")
    .$type<Certificate[]>()
    .notNull()
    .default([]),
  references: jsonb("references").$type<Reference[]>().notNull().default([]),
  // --- Single CV fields ---
  maritalStatus: maritalStatusEnum("marital_status"),
  driversLicense: varchar("drivers_license", { length: 50 }),
  linkedin: text("linkedin"),
  github: text("github"),
  portfolio: text("portfolio"),
  ...timestamps,
});

export const studentProfilesRelations = relations(
  studentProfilesTable,
  ({ one, many }) => ({
    user: one(users, {
      fields: [studentProfilesTable.userId],
      references: [users.id],
    }),
    targetCountries: many(studentTargetCountriesTable),
    languages: many(studentLanguagesTable),
  }),
);
