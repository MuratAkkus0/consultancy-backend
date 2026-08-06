import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { documentTypesTable } from "./document_types.js";
import { timestamps } from "./_shared.js";

// Storage lifecycle: are the bytes actually in S3? A row is born "pending"
// (upload intent); the client confirms after the direct-to-S3 upload succeeds.
export const documentStatusEnum = pgEnum("document_status_enum", [
  "pending",
  "uploaded",
]);

// Review lifecycle: has the assigned consultant checked the content? Kept as
// a separate column on purpose — it answers a different question than status.
export const documentReviewStatusEnum = pgEnum("document_review_status_enum", [
  "pending",
  "accepted",
  "rejected",
]);

export const documentsTable = pgTable(
  "documents",
  {
    id: uuid().defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Who put this file into the student's area. Equals studentId for a
    // self-upload; the consultant's id when a consultant uploads on the
    // student's behalf. Provenance for audit and delete authorization.
    uploadedById: uuid("uploaded_by_id")
      .notNull()
      .references(() => users.id),
    documentTypeId: uuid("document_type_id")
      .notNull()
      .references(() => documentTypesTable.id),
    status: documentStatusEnum("status").notNull().default("pending"),
    reviewStatus: documentReviewStatusEnum("review_status")
      .notNull()
      .default("pending"),
    // The original file name as the user uploaded it; used as the download
    // name via Content-Disposition. Not a title — never edited.
    documentName: varchar("document_name", { length: 255 }).notNull(),
    // S3 object key. Server-generated, never client-supplied
    documentKey: text("document_key").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    ...timestamps,
  },
  (t) => [index("documents_student_id_idx").on(t.studentId)],
);

export const documentsRelations = relations(documentsTable, ({ one }) => ({
  student: one(users, {
    fields: [documentsTable.studentId],
    references: [users.id],
  }),
  documentType: one(documentTypesTable, {
    fields: [documentsTable.documentTypeId],
    references: [documentTypesTable.id],
  }),
}));
