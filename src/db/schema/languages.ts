import { pgTable, varchar, uuid } from "drizzle-orm/pg-core";

export const languagesTable = pgTable("languages", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 50 }).notNull(),
});
