import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, type SQL } from "drizzle-orm";
import createHttpError from "http-errors";
import {
  consultantAssignmentsTable,
  db,
  documentsTable,
  documentTypesTable,
} from "../../db/index.js";
import { storage } from "../../lib/storage.js";
import type {
  CreateDocumentDTO,
  DocumentQuery,
  MyDocumentQuery,
  ReviewDocumentDTO,
} from "./documents.types.js";

// What API responses expose about a document. documentKey stays internal
const documentColumns = {
  id: true,
  studentId: true,
  documentTypeId: true,
  status: true,
  reviewStatus: true,
  documentName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  updatedAt: true,
} as const;

const documentTypeColumns = { id: true, code: true, name: true } as const;

// INSERT-precondition guard
const assertDocumentType = async (id: string) => {
  const documentType = await db.query.documentTypesTable.findFirst({
    where: and(
      eq(documentTypesTable.id, id),
      isNull(documentTypesTable.deletedAt),
    ),
    columns: { id: true, code: true },
  });

  if (!documentType) {
    throw createHttpError(404, "Document type not found.");
  }
  return documentType;
};

// Consultant scoping, the document's owner must be actively assigned to this consultant.
//  Inlined into WHEREs so an unassigned student's documents are unreachable by construction.
const ownedByAssignedStudent = (consultantId: string) =>
  inArray(
    documentsTable.studentId,
    db
      .select({ id: consultantAssignmentsTable.studentId })
      .from(consultantAssignmentsTable)
      .where(
        and(
          eq(consultantAssignmentsTable.consultantId, consultantId),
          isNull(consultantAssignmentsTable.deletedAt),
        ),
      ),
  );

const paginatedList = async (
  where: SQL | undefined,
  page: number,
  limit: number,
) => {
  const offset = (page - 1) * limit;

  const [data, total] = await Promise.all([
    db.query.documentsTable.findMany({
      limit,
      offset,
      where,
      orderBy: (documents, { desc }) => [desc(documents.createdAt)],
      columns: documentColumns,
      with: { documentType: { columns: documentTypeColumns } },
    }),
    db.$count(documentsTable, where),
  ]);

  return { data, total };
};

// Strips the storage address(documentKey) before a row leaves the service.
const toResponse = <T extends { documentKey: string }>(document: T) => {
  const { documentKey: _key, ...rest } = document;
  return rest;
};

const FILE_EXT_BY_MIME = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
} as const;

export const documentsService = {
  // Step 1 of the upload flow: validate the intent, create the row as
  // "pending" and hand back a short-lived URL the client PUTs the file to.
  // The S3 key is server-generated — a client-chosen key would allow
  // overwriting someone else's object.
  createForStudent: async (studentId: string, data: CreateDocumentDTO) => {
    const { code } = await assertDocumentType(data.documentTypeId);

    const documentKey = `private/students/${studentId}/documents/${code}-${randomUUID()}.${FILE_EXT_BY_MIME[data.mimeType]}`;

    const [document] = await db
      .insert(documentsTable)
      .values({ ...data, studentId, documentKey })
      .returning();

    const uploadUrl = await storage.getUploadUrl(documentKey, data.mimeType);

    return { document: toResponse(document!), uploadUrl };
  },

  // Step 2: the client reports the PUT succeeded. We only believe it after
  // asking S3 whether the object is really there — otherwise a dishonest or
  // broken client could flip a ghost row to "uploaded".
  confirmUploadForStudent: async (studentId: string, id: string) => {
    const scope = and(
      eq(documentsTable.id, id),
      eq(documentsTable.studentId, studentId),
      isNull(documentsTable.deletedAt),
    );

    const document = await db.query.documentsTable.findFirst({ where: scope });

    if (!document) {
      throw createHttpError(404, "Document not found.");
    }

    // Confirming twice is not an error — the second call just reports the
    // state that already holds (idempotent).
    if (document.status === "uploaded") {
      return toResponse(document);
    }

    const exists = await storage.objectExists(document.documentKey);
    if (!exists) {
      throw createHttpError(409, "The file has not been uploaded yet.");
    }

    const [updated] = await db
      .update(documentsTable)
      .set({ status: "uploaded" })
      .where(scope)
      .returning();

    return toResponse(updated!);
  },

  // The student sees all of their own documents, including pending ones —
  // those are their unfinished uploads, with status telling them so.
  listForStudent: async (studentId: string, params: MyDocumentQuery) => {
    const conditions = [
      eq(documentsTable.studentId, studentId),
      isNull(documentsTable.deletedAt),
    ];
    if (params.documentTypeId)
      conditions.push(eq(documentsTable.documentTypeId, params.documentTypeId));

    return paginatedList(and(...conditions), params.page, params.limit);
  },

  // A consultant sees only uploaded documents (a pending row has no file
  // behind it) and only for students actively assigned to them.
  listForConsultant: async (consultantId: string, params: DocumentQuery) => {
    const conditions = [
      eq(documentsTable.studentId, params.studentId),
      eq(documentsTable.status, "uploaded"),
      isNull(documentsTable.deletedAt),
      ownedByAssignedStudent(consultantId),
    ];
    if (params.documentTypeId)
      conditions.push(eq(documentsTable.documentTypeId, params.documentTypeId));

    return paginatedList(and(...conditions), params.page, params.limit);
  },

  // Admin sees everything for a student, pending rows included.
  list: async (params: DocumentQuery) => {
    const conditions = [
      eq(documentsTable.studentId, params.studentId),
      isNull(documentsTable.deletedAt),
    ];
    if (params.documentTypeId) {
      conditions.push(eq(documentsTable.documentTypeId, params.documentTypeId));
    }

    return paginatedList(and(...conditions), params.page, params.limit);
  },

  getDownloadUrlForStudent: async (studentId: string, id: string) => {
    const document = await db.query.documentsTable.findFirst({
      where: and(
        eq(documentsTable.id, id),
        eq(documentsTable.studentId, studentId),
        eq(documentsTable.status, "uploaded"),
        isNull(documentsTable.deletedAt),
      ),
      columns: { documentKey: true, documentName: true },
    });

    if (!document) {
      throw createHttpError(404, "Document not found.");
    }

    const url = await storage.getDownloadUrl(
      document.documentKey,
      document.documentName,
    );
    return { url };
  },

  getDownloadUrlForConsultant: async (consultantId: string, id: string) => {
    const document = await db.query.documentsTable.findFirst({
      where: and(
        eq(documentsTable.id, id),
        eq(documentsTable.status, "uploaded"),
        isNull(documentsTable.deletedAt),
        ownedByAssignedStudent(consultantId),
      ),
      columns: { documentKey: true, documentName: true },
    });

    if (!document) {
      throw createHttpError(404, "Document not found.");
    }

    const url = await storage.getDownloadUrl(
      document.documentKey,
      document.documentName,
    );
    return { url };
  },

  getDownloadUrl: async (id: string) => {
    const document = await db.query.documentsTable.findFirst({
      where: and(
        eq(documentsTable.id, id),
        eq(documentsTable.status, "uploaded"),
        isNull(documentsTable.deletedAt),
      ),
      columns: { documentKey: true, documentName: true },
    });

    if (!document) {
      throw createHttpError(404, "Document not found.");
    }

    const url = await storage.getDownloadUrl(
      document.documentKey,
      document.documentName,
    );
    return { url };
  },

  // Review is the assigned consultant's decision, scoped like every other
  // consultant query. Only uploaded documents can be reviewed — there is
  // nothing to look at behind a pending row.
  reviewByIdForConsultant: async (
    consultantId: string,
    id: string,
    data: ReviewDocumentDTO,
  ) => {
    const [document] = await db
      .update(documentsTable)
      .set({ reviewStatus: data.reviewStatus })
      .where(
        and(
          eq(documentsTable.id, id),
          eq(documentsTable.status, "uploaded"),
          isNull(documentsTable.deletedAt),
          ownedByAssignedStudent(consultantId),
        ),
      )
      .returning();

    if (!document) {
      throw createHttpError(404, "Document not found.");
    }

    return toResponse(document);
  },

  // A student may remove their own document (soft delete). The S3 object is
  // deliberately kept: the row can be restored, and invisible rows can't be
  // downloaded anyway.
  softDeleteByIdForStudent: async (studentId: string, id: string) => {
    const [document] = await db
      .update(documentsTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(documentsTable.id, id),
          eq(documentsTable.studentId, studentId),
          isNull(documentsTable.deletedAt),
        ),
      )
      .returning();

    if (!document) {
      throw createHttpError(404, "Document not found.");
    }

    return toResponse(document);
  },

  softDeleteById: async (id: string) => {
    const [document] = await db
      .update(documentsTable)
      .set({ deletedAt: new Date() })
      .where(and(eq(documentsTable.id, id), isNull(documentsTable.deletedAt)))
      .returning();

    if (!document) {
      throw createHttpError(404, "Document not found.");
    }

    return toResponse(document);
  },

  // Hard delete removes the row first, then the S3 object. The order is a
  // deliberate trade-off: if S3 fails afterwards we leak an orphan object
  // (harmless, costs cents); the reverse order could leave a live row
  // pointing at a deleted file, which would break downloads.
  hardDeleteById: async (id: string) => {
    const [document] = await db
      .delete(documentsTable)
      .where(eq(documentsTable.id, id))
      .returning();

    if (!document) {
      throw createHttpError(404, "Document not found.");
    }

    await storage.deleteObject(document.documentKey);

    return toResponse(document);
  },
};
