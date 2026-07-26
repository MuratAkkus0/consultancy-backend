import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";
import { adminProfilesTable } from "./admin_profiles.js";
import { consultantProfilesTable } from "./consultant_profiles.js";
import { studentProfilesTable } from "./student_profiles.js";
import { userConsentsTable } from "./user_consents.js";
import { consultantAssignmentsTable } from "./consultant_assignments.js";
import { coursesTable } from "./courses.js";
import { studentCoursesTable } from "./student_courses.js";
import { applicationsTable } from "./applications.js";
import { appointmentsTable } from "./appointments.js";

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

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    birthDate: timestamp("birth_date"),
    gender: userGenderEnum("gender"),
    role: userRoleEnum("role").default("student").notNull(),
    phone: text("phone"),
    preferredLanguage: text("preferred_language").default("tr"),
    timezone: text("timezone"),
    status: userStatusEnum("status").default("active"),
  },
  (t) => [index("users_role_created_at_idx").on(t.role, t.createdAt)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("sessions_userId_idx").on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("accounts_userId_idx").on(table.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  consents: many(userConsentsTable),
  adminProfile: one(adminProfilesTable, {
    fields: [users.id],
    references: [adminProfilesTable.userId],
  }),
  consultantProfile: one(consultantProfilesTable, {
    fields: [users.id],
    references: [consultantProfilesTable.userId],
  }),
  studentProfile: one(studentProfilesTable, {
    fields: [users.id],
    references: [studentProfilesTable.userId],
  }),
  assignmentsAsConsultant: many(consultantAssignmentsTable, {
    relationName: "assignment_consultant",
  }),
  assignmentsAsStudent: many(consultantAssignmentsTable, {
    relationName: "assignment_student",
  }),
  course: many(coursesTable),
  studentCourses: many(studentCoursesTable),
  applicationsAsConsultant: many(applicationsTable, {
    relationName: "applications_consultant_relation",
  }),
  applicationsAsStudent: many(applicationsTable, {
    relationName: "applications_student_relation",
  }),
  appointmentsAsConsultant: many(appointmentsTable, {
    relationName: "appointments_consultant_relation",
  }),
  appointmentsAsStudent: many(appointmentsTable, {
    relationName: "appointments_student_relation",
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  users: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  users: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));
