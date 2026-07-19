import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./auth.js";
import { timestamps } from "./_shared.js";
import type { ConsultantCertificate } from "../types.js";

export const consultantProfilesTable = pgTable("consultant_profiles", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text(),
  yearsOfExperience: integer("years_of_experience"),
  specializations: text().array(),
  languagesSpoken: text("languages_spoken").array(),
  education: text(),
  certifications: jsonb().$type<ConsultantCertificate[]>(),
  maxActiveStudents: integer("max_active_students").notNull().default(5),
  isAvailable: boolean("is_available").notNull().default(true),
  ...timestamps,
});

export const consultantProfilesRelations = relations(
  consultantProfilesTable,
  ({ one }) => ({
    user: one(users, {
      fields: [consultantProfilesTable.userId],
      references: [users.id],
    }),
  }),
);
