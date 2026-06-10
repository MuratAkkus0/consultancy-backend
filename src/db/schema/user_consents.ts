import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./auth.js";

export const consentTypeEnum = pgEnum("consent_type", [
  "data_processing",
  "marketing",
  "terms_of_service",
]);

export const userConsentsTable = pgTable(
  "user_consents",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: consentTypeEnum().notNull(),
    version: text().notNull(),
    contentHash: text("content_hash").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (t) => [index("user_consents_user_id_type_idx").on(t.userId, t.type)],
);

export const userConsentsRelations = relations(
  userConsentsTable,
  ({ one }) => ({
    user: one(users, {
      fields: [userConsentsTable.userId],
      references: [users.id],
    }),
  }),
);
