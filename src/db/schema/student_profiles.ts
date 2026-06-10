import {
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

export const educationLevelEnum = pgEnum("education_level", [
  "primary",
  "secondary",
  "high_school",
  "associate",
  "bachelor",
  "master",
  "doctorate",
]);

export type EducationLevel = (typeof educationLevelEnum.enumValues)[number];

export interface TargetProgram {
  country: string;
  university: string;
  program: string;
  degreeLevel: EducationLevel;
  intakeTerm: string;
  state?: string;
  city?: string;
  priority?: number;
  estimatedDeadline?: string; // ISO 8601: "2026-01-15"
  estimatedTuition?: {
    amount: number;
    currency: string;
  };
  websiteUrl?: string;
  notes?: string;
}

export const studentProfilesTable = pgTable("student_profiles", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  nationality: varchar({ length: 50 }),
  passportNumber: varchar("passport_number", { length: 50 }),
  currentEducationLevel: educationLevelEnum("current_education_level"),
  lastGraduatedEducationLevel: educationLevelEnum(
    "last_graduated_education_level",
  ),
  currentSchool: varchar("current_school", { length: 200 }),
  graduationYear: integer("graduation_year"),
  gpa: numeric({ precision: 4, scale: 2 }),
  ieltsScore: numeric("ielts_score", { precision: 4, scale: 2 }),
  toeflScore: numeric("toefl_score", { precision: 4, scale: 2 }),
  targetPrograms: jsonb("target_programs")
    .$type<TargetProgram[]>()
    .notNull()
    .default([]),
  targetEducationLevel: educationLevelEnum("target_education_level"),
  budgetRange: varchar("budget_range", { length: 50 }),
  additionalInfo: text("additional_info"),
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
  }),
);
