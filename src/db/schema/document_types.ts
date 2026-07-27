import { relations } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared.js";
import { documentsTable } from "./documents.js";

export const documentTypesTable = pgTable("document_types", {
  id: uuid().defaultRandom().primaryKey(),
  // Machine name ("passport"): stable, unique, safe for code to rely on.
  code: text().notNull().unique(),
  // Human label ("Pasaport"): what the UI shows; an admin may reword it.
  name: text().notNull(),
  // Soft delete via deletedAt doubles as "no longer offered for new uploads";
  // existing documents keep their FK and their history.
  ...timestamps,
});

export const documentTypesRelations = relations(
  documentTypesTable,
  ({ many }) => ({
    documents: many(documentsTable),
  }),
);
