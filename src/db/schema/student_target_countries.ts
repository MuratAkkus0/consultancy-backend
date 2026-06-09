import { pgTable, text, uuid, integer, primaryKey } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared.js";
import { studentProfilesTable } from "./student_profiles.js";
import { countriesTable } from "./countries.js";
import { relations } from "drizzle-orm";

export const studentTargetCountriesTable = pgTable(
  "student_target_countries",
  {
    studentProfileId: uuid("student_profile_id")
      .notNull()
      .references(() => studentProfilesTable.id, { onDelete: "cascade" }),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countriesTable.id, { onDelete: "restrict" }),
    priority: integer(),
    notes: text(),
    ...timestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.studentProfileId, t.countryId] }),
  }),
);

export const studentTargetCountriesRelations = relations(
  studentTargetCountriesTable,
  ({ one }) => ({
    studentProfile: one(studentProfilesTable, {
      fields: [studentTargetCountriesTable.studentProfileId],
      references: [studentProfilesTable.id],
    }),
    country: one(countriesTable, {
      fields: [studentTargetCountriesTable.countryId],
      references: [countriesTable.id],
    }),
  }),
);
