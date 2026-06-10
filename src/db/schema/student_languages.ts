import { relations } from "drizzle-orm";
import { pgEnum, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { studentProfilesTable } from "./student_profiles.js";
import { languagesTable } from "./languages.js";

export const languageLevel = pgEnum("language_level", [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
]);

export const studentLanguagesTable = pgTable(
  "student_languages",
  {
    studenProfileId: uuid("student_id").notNull(),
    languageId: uuid("language_id").notNull(),
    level: languageLevel(),
    certificates: text("certificates").array().default([]),
  },
  (t) => [primaryKey({ columns: [t.studenProfileId, t.languageId] })],
);

export const studentLanguagesRelations = relations(
  studentLanguagesTable,
  ({ one }) => ({
    studentProfile: one(studentProfilesTable, {
      fields: [studentLanguagesTable.studenProfileId],
      references: [studentProfilesTable.id],
    }),
    language: one(languagesTable, {
      fields: [studentLanguagesTable.languageId],
      references: [languagesTable.id],
    }),
  }),
);
