import { db } from "../../db/db.js";
import createHttpError from "http-errors";
import { consultantAssignmentsTable } from "../../db/schema/consultant_assignments.js";
import type {
  AdminEditAssignmentDTO,
  AssignStudentToConsultantDTO,
  StudentEditAssignmentDTO,
} from "./assignments.types.js";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { consultantProfilesTable, users } from "../../db/index.js";
import { applicationsService } from "../applications/applications.service.js";
import { appointmentsService } from "../appointments/appointments.service.js";
import { userBaseColumns, userIdentityColumns } from "../../db/selections.js";

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

      // The student's active applications follow them to their new consultant;
      // the old consultant loses access (all their queries are consultant-scoped).
      // Runs on `tx` so the assignment and the handover commit atomically.
      await applicationsService.reassignAllForStudent(
        studentId,
        consultantId,
        tx,
      );

      // Future appointments follow too; ones clashing with the new consultant's
      // calendar are cancelled instead. Safe here: the new consultant's row is
      // already locked FOR UPDATE at the top of this transaction.
      await appointmentsService.reassignFutureForStudent(
        studentId,
        consultantId,
        tx,
      );

      return newAssignment;
    });

    return result;
  },
  getConsultantForStudent: async (id: string) => {
    const activeUserIds = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.status, "active"));

    const where = and(
      eq(consultantAssignmentsTable.studentId, id),
      isNull(consultantAssignmentsTable.deletedAt),
      inArray(consultantAssignmentsTable.consultantId, activeUserIds),
    );

    const consultant = await db.query.consultantAssignmentsTable.findFirst({
      where,
      columns: {
        id: true,
        consultantId: true,
        studentId: true,
        createdAt: true,
      },
      with: {
        consultant: {
          columns: userBaseColumns,
        },
      },
    });

    return consultant;
  },
  getStudentsForConsultant: async (id: string, page: number, limit: number) => {
    const offset = (page - 1) * limit;

    const activeUserIds = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.status, "active"));

    const where = and(
      eq(consultantAssignmentsTable.consultantId, id),
      isNull(consultantAssignmentsTable.deletedAt),
      inArray(consultantAssignmentsTable.studentId, activeUserIds),
    );

    const [data, total] = await Promise.all([
      db.query.consultantAssignmentsTable.findMany({
        offset,
        limit,
        where,
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        columns: {
          id: true,
          consultantId: true,
          studentId: true,
          createdAt: true,
          consultantNotes: true,
        },
        with: { student: { columns: userIdentityColumns } },
      }),
      db.$count(consultantAssignmentsTable, where),
    ]);

    return { data, total };
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
