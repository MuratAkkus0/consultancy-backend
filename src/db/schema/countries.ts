import { boolean, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared.js";
import { relations } from "drizzle-orm";
import { studentTargetCountriesTable } from "./student_target_countries.js";

export const countriesTable = pgTable("countries", {
  id: uuid().primaryKey().defaultRandom(),
  countryCode: varchar("country_code", { length: 2 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 100 }).notNull(),
  nameTr: varchar("name_tr", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const countriesRelations = relations(countriesTable, ({ many }) => ({
  studentTargets: many(studentTargetCountriesTable),
}));
