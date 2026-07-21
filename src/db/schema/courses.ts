import { date, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared.js";
import { relations } from "drizzle-orm";
import { studentCoursesTable } from "./student_courses.js";
import { users } from "./auth.js";

export const coursesTable = pgTable("courses", {
  id: uuid().defaultRandom().primaryKey(),
  consultantId: uuid("consultant_id").references(() => users.id, {
    onDelete: "restrict",
  }),
  consultantNotes: text("consultant_notes"),
  courseName: varchar("course_name", { length: 200 }).notNull(),
  courseDescription: text("course_description"),
  // Managed by the consultant, not the admin.
  meetingLink: text("meeting_link"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  schedule: text("schedule"),
  level: text("level"),
  ...timestamps,
});

export const coursesRelations = relations(coursesTable, ({ one, many }) => ({
  consultant: one(users, {
    fields: [coursesTable.consultantId],
    references: [users.id],
  }),
  studentCourses: many(studentCoursesTable),
}));
