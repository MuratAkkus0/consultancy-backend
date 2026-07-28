import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { timestamps } from "./_shared.js";
import { relations, sql } from "drizzle-orm";

export const appointmentTypeEnum = pgEnum("appointment_type", [
  "online",
  "face_to_face",
]);

export const appointmentsTable = pgTable(
  "appointments",
  {
    id: uuid().defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id),
    consultantId: uuid("consultant_id")
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    appointmentType: appointmentTypeEnum("appointment_type").notNull(),
    meetingLink: text("meeting_link"),
    // Full date AND time of the meeting.
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    // The booking window is [scheduledAt, scheduledAt + durationMinutes).
    // Overlap between a consultant's appointments is enforced in the service
    // (assertNoOverlap under a FOR UPDATE lock) — the unique index below only
    // backstops the exact-same-start case at the DB level.
    durationMinutes: integer("duration_minutes").notNull().default(30),
    ...timestamps,
  },
  (t) => [
    index("appointments_student_id_idx").on(t.studentId),
    index("appointments_consultant_id_idx").on(t.consultantId),
    index("appointments_scheduled_at_idx").on(t.scheduledAt),
    // A consultant can hold only one active appointment per exact start time.
    uniqueIndex("uniq_consultant_appointment_slot")
      .on(t.consultantId, t.scheduledAt)
      .where(sql`deleted_at IS NULL`),
  ],
);

export const appointmentsRelations = relations(
  appointmentsTable,
  ({ one }) => ({
    consultant: one(users, {
      fields: [appointmentsTable.consultantId],
      references: [users.id],
      relationName: "appointments_consultant_relation",
    }),
    student: one(users, {
      fields: [appointmentsTable.studentId],
      references: [users.id],
      relationName: "appointments_student_relation",
    }),
  }),
);
