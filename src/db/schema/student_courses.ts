import { pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./auth.js";
import { coursesTable } from "./courses.js";
import { timestamps } from "./_shared.js";
import { index } from "drizzle-orm/pg-core";

// Join table for the many-to-many between courses and students: one course has
// many students, one student can be enrolled in many courses.
export const studentCoursesTable = pgTable(
  "student_courses",
  {
    id: uuid().defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    index("student_courses_student_id_idx").on(t.studentId),
    index("student_courses_course_id_idx").on(t.courseId),
    uniqueIndex("uniq_active_enrollment")
      .on(t.courseId, t.studentId)
      .where(sql`deleted_at IS NULL`),
  ],
);

export const studentCoursesRelations = relations(
  studentCoursesTable,
  ({ one }) => ({
    course: one(coursesTable, {
      fields: [studentCoursesTable.courseId],
      references: [coursesTable.id],
    }),
    student: one(users, {
      fields: [studentCoursesTable.studentId],
      references: [users.id],
    }),
  }),
);
