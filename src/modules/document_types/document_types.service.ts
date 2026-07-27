import { and, eq, isNotNull, isNull } from "drizzle-orm";
import createHttpError from "http-errors";
import { db, documentTypesTable } from "../../db/index.js";
import type {
  CreateDocumentTypeDTO,
  EditDocumentTypeDTO,
} from "./document_types.types.js";

export const documentTypesService = {
  list: async () => {
    return db.query.documentTypesTable.findMany({
      where: isNull(documentTypesTable.deletedAt),
      orderBy: (types, { asc }) => [asc(types.name)],
      columns: { id: true, code: true, name: true },
    });
  },

  create: async (data: CreateDocumentTypeDTO) => {
    const [documentType] = await db
      .insert(documentTypesTable)
      .values(data)
      .onConflictDoUpdate({
        target: documentTypesTable.code,
        set: { name: data.name, deletedAt: null },
        setWhere: isNotNull(documentTypesTable.deletedAt),
      })
      .returning();

    if (!documentType) {
      throw createHttpError(
        409,
        "A document type with this code already exists.",
      );
    }

    return documentType;
  },

  // Only the label; code is immutable identity (see validators).
  editById: async (id: string, data: EditDocumentTypeDTO) => {
    const [documentType] = await db
      .update(documentTypesTable)
      .set(data)
      .where(
        and(
          eq(documentTypesTable.id, id),
          isNull(documentTypesTable.deletedAt),
        ),
      )
      .returning();

    if (!documentType) {
      throw createHttpError(404, "Document type not found.");
    }

    return documentType;
  },

  // Soft delete doubles as "no longer offered": new uploads can't reference
  // it (the documents service checks deletedAt), existing documents keep
  // their FK and their history.
  softDeleteById: async (id: string) => {
    const [documentType] = await db
      .update(documentTypesTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(documentTypesTable.id, id),
          isNull(documentTypesTable.deletedAt),
        ),
      )
      .returning();

    if (!documentType) {
      throw createHttpError(404, "Document type not found.");
    }

    return documentType;
  },
};
