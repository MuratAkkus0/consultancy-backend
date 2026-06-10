import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./auth.js";
import { timestamps } from "./_shared.js";

export const adminProfilesTable = pgTable("admin_profiles", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, {
      onDelete: "cascade",
    }),
  notes: text().array(),
  ...timestamps,
});

export const adminProfilesRelations = relations(
  adminProfilesTable,
  ({ one }) => ({
    user: one(users, {
      fields: [adminProfilesTable.userId],
      references: [users.id],
    }),
  }),
);
