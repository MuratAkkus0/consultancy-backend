import { db } from "../../db/db.js";
import createHttpError from "http-errors";
import { consultantAssignmentsTable } from "../../db/schema/consultant_assignments.js";
import type {
  AdminEditAssignmentDTO,
  AssignStudentToConsultantDTO,
  StudentEditAssignmentDTO,
} from "./assignments.types.js";
import { and, eq, getTableColumns, isNull } from "drizzle-orm";
import { consultantProfilesTable, users } from "../../db/index.js";

export const assignmentsService = {
  editByIdForStudent: async (id: string, data: StudentEditAssignmentDTO) => {
    const { studentId, studentFeedback } = data;

    const [assignment] = await db
      .update(consultantAssignmentsTable)
      .set({ studentFeedback })
      .where(
        and(
          eq(consultantAssignmentsTable.studentId, studentId),
          eq(consultantAssignmentsTable.id, id),
          isNull(consultantAssignmentsTable.deletedAt),
        ),
      )
      .returning();

    if (!assignment) {
      throw createHttpError(404, "Assignment not found.");
    }

    return assignment;
  },
  editByIdForAdmin: async (id: string, data: AdminEditAssignmentDTO) => {
    const [assignment] = await db
      .update(consultantAssignmentsTable)
      .set(data)
      .where(eq(consultantAssignmentsTable.id, id))
      .returning();

    if (!assignment) {
      throw createHttpError(404, "Assignment not found.");
    }

    return assignment;
  },
  assignStudentToConsultant: async (data: AssignStudentToConsultantDTO) => {
    const { consultantId, studentId } = data;
    const result = await db.transaction(async (tx) => {
      const [consultant] = await tx
        .select({
          maxActiveStudents: consultantProfilesTable.maxActiveStudents,
          isAvailable: consultantProfilesTable.isAvailable,
        })
        .from(users)
        .where(and(eq(users.id, consultantId), eq(users.status, "active")))
        .innerJoin(
          consultantProfilesTable,
          eq(consultantProfilesTable.userId, consultantId),
        )
        .for("update");

      if (!consultant) {
        throw createHttpError(404, "Consultant not found.");
      }

      const [student] = await tx
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, studentId),
            eq(users.status, "active"),
            eq(users.role, "student"),
          ),
        );

      if (!student) throw createHttpError(404, "Student not found.");

      if (!consultant.isAvailable) {
        throw createHttpError(409, "Consultant is not available.");
      }

      const consultantStudentsCount = await tx.$count(
        consultantAssignmentsTable,
        and(
          eq(consultantAssignmentsTable.consultantId, consultantId),
          isNull(consultantAssignmentsTable.deletedAt),
        ),
      );

      if (consultantStudentsCount >= consultant.maxActiveStudents) {
        throw createHttpError(409, "Consultant is at full capacity.");
      }

      const [newAssignment] = await tx
        .insert(consultantAssignmentsTable)
        .values(data)
        .returning();

      return newAssignment;
    });

    return result;
  },
  getConsultantForStudent: async (id: string) => {
    const {
      updatedAt,
      createdAt,
      role,
      emailVerified,
      ...filteredUserColumns
    } = getTableColumns(users);

    const consultants = await db
      .select({
        id: consultantAssignmentsTable.id,
        consultantId: consultantAssignmentsTable.consultantId,
        studentId: consultantAssignmentsTable.studentId,
        assignedAt: consultantAssignmentsTable.createdAt,
        consultant: filteredUserColumns,
      })
      .from(consultantAssignmentsTable)
      .innerJoin(
        users,
        and(eq(users.id, consultantAssignmentsTable.consultantId)),
      )
      .where(
        and(
          eq(consultantAssignmentsTable.studentId, id),
          isNull(consultantAssignmentsTable.deletedAt),
        ),
      );

    return consultants;
  },
  getStudentsForConsultant: async (id: string) => {
    const {
      updatedAt,
      createdAt,
      status,
      role,
      emailVerified,
      ...filteredUserColumns
    } = getTableColumns(users);

    const students = await db
      .select({
        id: consultantAssignmentsTable.id,
        consultantId: consultantAssignmentsTable.consultantId,
        studentId: consultantAssignmentsTable.studentId,
        assignedAt: consultantAssignmentsTable.createdAt,
        student: filteredUserColumns,
      })
      .from(consultantAssignmentsTable)
      .innerJoin(
        users,
        and(
          eq(users.id, consultantAssignmentsTable.studentId),
          eq(users.status, "active"),
        ),
      )
      .where(
        and(
          eq(consultantAssignmentsTable.consultantId, id),
          isNull(consultantAssignmentsTable.deletedAt),
        ),
      );

    return students;
  },
  getStudentConsultantsForAdmin: async (id: string) => {
    const consultants = await db.query.consultantAssignmentsTable.findMany({
      where: (table, { eq }) => eq(table.studentId, id),
      with: {
        consultant: true,
      },
    });
    return consultants;
  },
  getConsultantStudentsForAdmin: async (id: string) => {
    const students = await db.query.consultantAssignmentsTable.findMany({
      where: (table, { eq }) => eq(table.consultantId, id),
      with: {
        student: true,
      },
    });
    return students;
  },
  softDeleteById: async (id: string) => {
    const [assignment] = await db
      .update(consultantAssignmentsTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(consultantAssignmentsTable.id, id),
          isNull(consultantAssignmentsTable.deletedAt),
        ),
      )
      .returning();

    if (!assignment) {
      throw createHttpError(404, "Assignment not found.");
    }

    return assignment;
  },
  hardDeleteById: async (id: string) => {
    const [assignment] = await db
      .delete(consultantAssignmentsTable)
      .where(eq(consultantAssignmentsTable.id, id))
      .returning();

    if (!assignment) {
      throw createHttpError(404, "Assignment not found.");
    }

    return assignment;
  },
};
