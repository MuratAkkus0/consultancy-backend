import { pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { timestamps } from "./_shared.js";
import { relations, sql } from "drizzle-orm";

export const consultantAssignmentsTable = pgTable(
  "consultant_assignments",
  {
    id: uuid().defaultRandom().primaryKey(),
    consultantId: uuid("consultant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentFeedback: text("student_feedback"),
    adminNotes: text("admin_notes"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_active_assignment")
      .on(t.studentId)
      .where(sql`${t.deletedAt} IS NULL`),
  ],
);

export const consultantAssignmentsRelations = relations(
  consultantAssignmentsTable,
  ({ one }) => ({
    consultant: one(users, {
      fields: [consultantAssignmentsTable.consultantId],
      references: [users.id],
      relationName: "assignment_consultant",
    }),
    student: one(users, {
      fields: [consultantAssignmentsTable.studentId],
      references: [users.id],
      relationName: "assignment_student",
    }),
  }),
);
