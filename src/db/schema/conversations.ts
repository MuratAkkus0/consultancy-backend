import { check, pgEnum, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { timestamps } from "./_shared.js";
import { coursesTable } from "./courses.js";
import { relations, sql } from "drizzle-orm";
import { messagesTable } from "./messages.js";

export const conversationTypeEnum = pgEnum("conversation_type", [
  "direct",
  "course",
]);

export const conversationsTable = pgTable(
  "conversations",
  {
    id: uuid().defaultRandom().primaryKey(),
    type: conversationTypeEnum().notNull().default("direct"),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => coursesTable.id, {
      onDelete: "cascade",
    }),
    ...timestamps,
  },
  (t) => [
    check("conv_user_a_lt_b", sql`${t.userAId} < ${t.userBId}`),
    uniqueIndex("unique_direct_pair")
      .on(t.userAId, t.userBId)
      .where(sql`${t.type} = 'direct'`),
  ],
);

export const conversationsRelations = relations(
  conversationsTable,
  ({ one, many }) => ({
    userA: one(users, {
      fields: [conversationsTable.userAId],
      references: [users.id],
      relationName: "conversation_user_a",
    }),
    userB: one(users, {
      fields: [conversationsTable.userBId],
      references: [users.id],
      relationName: "conversation_user_b",
    }),
    course: one(coursesTable, {
      fields: [conversationsTable.courseId],
      references: [coursesTable.id],
    }),
    messages: many(messagesTable),
  }),
);
