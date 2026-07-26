import {
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { timestamps } from "./_shared.js";
import { relations } from "drizzle-orm";

export const applicationStatusEnum = pgEnum("application_status_enum", [
  "applied",
  "accepted",
  "rejected",
]);

export const applicationsTable = pgTable(
  "applications",
  {
    id: uuid().primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id),
    consultantId: uuid("consultant_id")
      .notNull()
      .references(() => users.id),
    // Managed exclusively by the owning consultant, never shown to the student.
    consultantNotes: text("consultant_notes"),
    title: varchar("application_title", { length: 200 }).notNull(),
    status: applicationStatusEnum("status").notNull().default("applied"),
    universityName: text("university_name"),
    targetProgram: text("target_program"),
    monthlySalary: numeric("monthly_salary", { precision: 12, scale: 2 }),
    websiteLink: text("website_link"),
    targetCity: text("target_city"),
    targetState: text("target_state"),
    programStartDate: date("program_start_date"),
    programEndDate: date("program_end_date"),
    ...timestamps,
  },
  (t) => [
    index("applications_student_id_idx").on(t.studentId),
    index("applications_consultant_id_idx").on(t.consultantId),
  ],
);

export const applicationRelations = relations(applicationsTable, ({ one }) => ({
  consultant: one(users, {
    fields: [applicationsTable.consultantId],
    references: [users.id],
    relationName: "applications_consultant_relation",
  }),
  student: one(users, {
    fields: [applicationsTable.studentId],
    references: [users.id],
    relationName: "applications_student_relation",
  }),
}));
