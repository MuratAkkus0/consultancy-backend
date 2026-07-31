import { and, eq, inArray, isNull } from "drizzle-orm";
import createHttpError from "http-errors";
import {
  consultantAssignmentsTable,
  db,
  documentsTable,
  documentTypesTable,
  studentRequiredDocumentsTable,
} from "../../db/index.js";
import type {
  CreateRequiredDocumentDTO,
  RequiredDocumentQuery,
} from "./required_documents.types.js";

const requiredDocumentColumns = {
  id: true,
  studentId: true,
  documentTypeId: true,
  note: true,
  createdAt: true,
} as const;

const documentTypeColumns = { id: true, code: true, name: true } as const;

// INSERT-precondition guard: the type must exist and still be offered.
const assertDocumentType = async (id: string) => {
  const documentType = await db.query.documentTypesTable.findFirst({
    where: and(
      eq(documentTypesTable.id, id),
      isNull(documentTypesTable.deletedAt),
    ),
    columns: { id: true },
  });

  if (!documentType) {
    throw createHttpError(404, "Document type not found.");
  }
};

// A consultant may only act on a student actively assigned to them.
const assertStudentAssignedToConsultant = async (
  consultantId: string,
  studentId: string,
) => {
  const assignment = await db.query.consultantAssignmentsTable.findFirst({
    where: and(
      eq(consultantAssignmentsTable.consultantId, consultantId),
      eq(consultantAssignmentsTable.studentId, studentId),
      isNull(consultantAssignmentsTable.deletedAt),
    ),
    columns: { id: true },
  });

  if (!assignment) {
    throw createHttpError(403, "Student is not assigned to you.");
  }
};

// Subquery of the ids of students actively assigned to this consultant, so a
// consultant can never reach an unassigned student's rows.
const assignedStudentIds = (consultantId: string) =>
  db
    .select({ id: consultantAssignmentsTable.studentId })
    .from(consultantAssignmentsTable)
    .where(
      and(
        eq(consultantAssignmentsTable.consultantId, consultantId),
        isNull(consultantAssignmentsTable.deletedAt),
      ),
    );

// A requirement is "met" when the student has an uploaded document of that
// type. Computed here (not stored) so there is a single source of truth.
const listWithFulfillment = async (studentId: string) => {
  const [required, uploaded] = await Promise.all([
    db.query.studentRequiredDocumentsTable.findMany({
      where: eq(studentRequiredDocumentsTable.studentId, studentId),
      orderBy: (t, { asc }) => [asc(t.createdAt)],
      columns: requiredDocumentColumns,
      with: { documentType: { columns: documentTypeColumns } },
    }),
    db
      .select({ documentTypeId: documentsTable.documentTypeId })
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.studentId, studentId),
          eq(documentsTable.status, "uploaded"),
          isNull(documentsTable.deletedAt),
        ),
      ),
  ]);

  const uploadedTypeIds = new Set(uploaded.map((d) => d.documentTypeId));

  return required.map((requirement) => ({
    ...requirement,
    fulfilled: uploadedTypeIds.has(requirement.documentTypeId),
  }));
};

const insert = async (data: CreateRequiredDocumentDTO, assignedBy: string) => {
  const [requirement] = await db
    .insert(studentRequiredDocumentsTable)
    .values({ ...data, assignedBy })
    .returning();

  return requirement;
};

export const requiredDocumentsService = {
  // Admin path: not constrained by assignments.
  assign: async (data: CreateRequiredDocumentDTO, assignedBy: string) => {
    await assertDocumentType(data.documentTypeId);
    return insert(data, assignedBy);
  },

  // Consultant path: only for a student assigned to them.
  assignForConsultant: async (
    consultantId: string,
    data: CreateRequiredDocumentDTO,
  ) => {
    await assertStudentAssignedToConsultant(consultantId, data.studentId);
    await assertDocumentType(data.documentTypeId);
    return insert(data, consultantId);
  },

  list: async (params: RequiredDocumentQuery) => {
    return listWithFulfillment(params.studentId);
  },

  listForConsultant: async (
    consultantId: string,
    params: RequiredDocumentQuery,
  ) => {
    await assertStudentAssignedToConsultant(consultantId, params.studentId);
    return listWithFulfillment(params.studentId);
  },

  // The student's own view (/me/required-documents): the id comes from the
  // session, so it is inherently scoped to themselves.
  listForStudent: async (studentId: string) => {
    return listWithFulfillment(studentId);
  },

  removeById: async (id: string) => {
    const [requirement] = await db
      .delete(studentRequiredDocumentsTable)
      .where(eq(studentRequiredDocumentsTable.id, id))
      .returning();

    if (!requirement) {
      throw createHttpError(404, "Required document not found.");
    }

    return requirement;
  },

  removeByIdForConsultant: async (consultantId: string, id: string) => {
    const [requirement] = await db
      .delete(studentRequiredDocumentsTable)
      .where(
        and(
          eq(studentRequiredDocumentsTable.id, id),
          inArray(
            studentRequiredDocumentsTable.studentId,
            assignedStudentIds(consultantId),
          ),
        ),
      )
      .returning();

    if (!requirement) {
      throw createHttpError(404, "Required document not found.");
    }

    return requirement;
  },
};
