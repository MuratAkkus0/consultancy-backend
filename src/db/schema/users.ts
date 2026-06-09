import {
  date,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { timestamps } from "./_shared.js";
import { adminProfilesTable } from "./admin_profiles.js";
import { consultantProfilesTable } from "./consultant_profiles.js";
import { studentProfilesTable } from "./student_profiles.js";

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "consultant",
  "student",
]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "inactive",
  "deleted",
]);

export const userGenderEnum = pgEnum("gender", [
  "male",
  "female",
  "prefer_not_to_say",
]);

export const usersTable = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  firstName: varchar("first_name", { length: 40 }).notNull(),
  lastName: varchar("last_name", { length: 40 }).notNull(),
  birthDate: date("birth_date"),
  gender: userGenderEnum(),
  email: varchar({ length: 256 }).notNull().unique(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  passwordHash: varchar("password_hash", { length: 256 }).notNull(),
  role: userRoleEnum().notNull().default("student"),
  phone: varchar({ length: 20 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  preferredLanguage: varchar("preferred_language", { length: 10 })
    .notNull()
    .default("tr"),
  timezone: varchar({ length: 50 }),
  status: userStatusEnum().notNull().default("active"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
});

export const userRelations = relations(usersTable, ({ one }) => ({
  adminProfile: one(adminProfilesTable, {
    fields: [usersTable.id],
    references: [adminProfilesTable.userId],
  }),
  consultantProfile: one(consultantProfilesTable, {
    fields: [usersTable.id],
    references: [consultantProfilesTable.userId],
  }),
  studentProfile: one(studentProfilesTable, {
    fields: [usersTable.id],
    references: [studentProfilesTable.userId],
  }),
}));

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type UserStatus = (typeof userStatusEnum.enumValues)[number];
export type UserGender = (typeof userGenderEnum.enumValues)[number];
