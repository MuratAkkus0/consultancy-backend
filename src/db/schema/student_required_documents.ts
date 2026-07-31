import { relations } from "drizzle-orm";
import { pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { documentTypesTable } from "./document_types.js";
import { timestamps } from "./_shared.js";

// A document a consultant requires a specific student to provide. Fulfillment
// is NOT stored here: a requirement is "met" when the student has an uploaded
// document of this type (computed by joining the documents table), so there is
// a single source of truth and nothing to keep in sync.
export const studentRequiredDocumentsTable = pgTable(
  "student_required_documents",
  {
    id: uuid().defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentTypeId: uuid("document_type_id")
      .notNull()
      .references(() => documentTypesTable.id, { onDelete: "restrict" }),
    assignedBy: uuid("assigned_by").references(() => users.id),
    note: text("note"),
    ...timestamps,
  },
  (t) => [
    unique("uniq_student_required_document").on(t.studentId, t.documentTypeId),
  ],
);

export const studentRequiredDocumentsRelations = relations(
  studentRequiredDocumentsTable,
  ({ one }) => ({
    student: one(users, {
      fields: [studentRequiredDocumentsTable.studentId],
      references: [users.id],
      relationName: "required_document_student",
    }),
    documentType: one(documentTypesTable, {
      fields: [studentRequiredDocumentsTable.documentTypeId],
      references: [documentTypesTable.id],
    }),
    assignedByUser: one(users, {
      fields: [studentRequiredDocumentsTable.assignedBy],
      references: [users.id],
      relationName: "required_document_assigned_by",
    }),
  }),
);
