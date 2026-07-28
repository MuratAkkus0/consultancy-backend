import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared.js";

export const s3DeletionQueuesTable = pgTable("s3_deletion_queues", {
  id: uuid().defaultRandom().primaryKey(),
  objectKey: text("object_key").notNull().unique(),
  attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ...timestamps,
});
