import { and, eq, isNull } from "drizzle-orm";
import createHttpError from "http-errors";
import { applicationsTable, db, type DbExecutor } from "../../db/index.js";
import { userBaseColumns, userIdentityColumns } from "../../db/selections.js";
import type {
  ApplicationQuery,
  ConsultantCreateApplicationDTO,
  ConsultantEditApplicationDTO,
  CreateApplicationDTO,
  EditApplicationDTO,
  StudentApplicationQuery,
} from "./applications.types.js";

// Ensures the given id belongs to an active consultant, otherwise 404.
const assertActiveConsultant = async (consultantId: string) => {
  const consultant = await db.query.users.findFirst({
    where: (table, { eq, and }) =>
      and(
        eq(table.id, consultantId),
        eq(table.role, "consultant"),
        eq(table.status, "active"),
      ),
    columns: { id: true },
  });

  if (!consultant) {
    throw createHttpError(404, "Consultant not found.");
  }
};

// Ensures the given id belongs to an active student, otherwise 404.
const assertActiveStudent = async (studentId: string) => {
  const student = await db.query.users.findFirst({
    where: (table, { eq, and }) =>
      and(
        eq(table.id, studentId),
        eq(table.role, "student"),
        eq(table.status, "active"),
      ),
    columns: { id: true },
  });

  if (!student) {
    throw createHttpError(404, "Student not found.");
  }
};

// Ensures the student is actively assigned to this consultant. A consultant may
// only file applications for their own students, otherwise 403.
const assertStudentAssignedToConsultant = async (
  consultantId: string,
  studentId: string,
) => {
  const assignment = await db.query.consultantAssignmentsTable.findFirst({
    where: (table, { eq, and, isNull }) =>
      and(
        eq(table.consultantId, consultantId),
        eq(table.studentId, studentId),
        isNull(table.deletedAt),
      ),
    columns: { id: true },
  });

  if (!assignment) {
    throw createHttpError(403, "Student is not assigned to you.");
  }
};

export const applicationsService = {
  // Admin path: names both parties, so both are validated as active. An admin is
  // not constrained by consultant/student assignments.
  create: async (data: CreateApplicationDTO) => {
    await Promise.all([
      assertActiveConsultant(data.consultantId),
      assertActiveStudent(data.studentId),
    ]);

    const [application] = await db
      .insert(applicationsTable)
      .values(data)
      .returning();

    return application;
  },

  // Consultant path: the consultant files under their own id and may only do so
  // for a student actively assigned to them.
  createForConsultant: async (
    consultantId: string,
    data: ConsultantCreateApplicationDTO,
  ) => {
    await assertActiveStudent(data.studentId);
    await assertStudentAssignedToConsultant(consultantId, data.studentId);

    const [application] = await db
      .insert(applicationsTable)
      .values({ ...data, consultantId })
      .returning();

    return application;
  },

  list: async (params: ApplicationQuery) => {
    const { page, limit, studentId, consultantId, status } = params;
    const offset = (page - 1) * limit;

    const conditions = [isNull(applicationsTable.deletedAt)];

    if (studentId) conditions.push(eq(applicationsTable.studentId, studentId));
    if (consultantId)
      conditions.push(eq(applicationsTable.consultantId, consultantId));
    if (status) conditions.push(eq(applicationsTable.status, status));

    const where = and(...conditions);

    const [data, total] = await Promise.all([
      db.query.applicationsTable.findMany({
        limit,
        offset,
        where,
        orderBy: (applications, { desc }) => [desc(applications.createdAt)],
        with: {
          student: { columns: userIdentityColumns },
          consultant: { columns: userIdentityColumns },
        },
      }),
      db.$count(applicationsTable, where),
    ]);

    return { data, total };
  },

  // A consultant only ever sees applications they own; the session id is forced
  // into the filter, so a `consultantId` query param can never widen the scope.
  listForConsultant: async (consultantId: string, params: ApplicationQuery) => {
    const { page, limit, studentId, status } = params;
    const offset = (page - 1) * limit;

    const conditions = [
      isNull(applicationsTable.deletedAt),
      eq(applicationsTable.consultantId, consultantId),
    ];
    if (studentId) conditions.push(eq(applicationsTable.studentId, studentId));
    if (status) conditions.push(eq(applicationsTable.status, status));

    const where = and(...conditions);

    const [data, total] = await Promise.all([
      db.query.applicationsTable.findMany({
        limit,
        offset,
        where,
        orderBy: (applications, { desc }) => [desc(applications.createdAt)],
        with: {
          student: { columns: userIdentityColumns },
        },
      }),
      db.$count(applicationsTable, where),
    ]);

    return { data, total };
  },

  // The student's own applications, with the consultant's identity attached.
  // consultantNotes is the consultant's private field and is never exposed here.
  listForStudent: async (
    studentId: string,
    params: StudentApplicationQuery,
  ) => {
    const { page, limit, status } = params;
    const offset = (page - 1) * limit;

    const conditions = [
      isNull(applicationsTable.deletedAt),
      eq(applicationsTable.studentId, studentId),
    ];
    if (status) conditions.push(eq(applicationsTable.status, status));

    const where = and(...conditions);

    const [data, total] = await Promise.all([
      db.query.applicationsTable.findMany({
        limit,
        offset,
        where,
        orderBy: (applications, { desc }) => [desc(applications.createdAt)],
        columns: { consultantNotes: false },
        with: {
          consultant: { columns: userBaseColumns },
        },
      }),
      db.$count(applicationsTable, where),
    ]);

    return { data, total };
  },

  getById: async (id: string) => {
    const application = await db.query.applicationsTable.findFirst({
      where: and(
        eq(applicationsTable.id, id),
        isNull(applicationsTable.deletedAt),
      ),
      with: {
        student: { columns: userIdentityColumns },
        consultant: { columns: userIdentityColumns },
      },
    });

    if (!application) {
      throw createHttpError(404, "Application not found.");
    }

    return application;
  },

  getByIdForConsultant: async (consultantId: string, id: string) => {
    const application = await db.query.applicationsTable.findFirst({
      where: and(
        eq(applicationsTable.id, id),
        eq(applicationsTable.consultantId, consultantId),
        isNull(applicationsTable.deletedAt),
      ),
      with: {
        student: { columns: userIdentityColumns },
      },
    });

    if (!application) {
      throw createHttpError(404, "Application not found.");
    }

    return application;
  },
  getByIdForStudent: async (studentId: string, id: string) => {
    const application = await db.query.applicationsTable.findFirst({
      columns: { consultantNotes: false },
      where: and(
        eq(applicationsTable.id, id),
        eq(applicationsTable.studentId, studentId),
        isNull(applicationsTable.deletedAt),
      ),
      with: {
        consultant: { columns: userBaseColumns },
      },
    });

    if (!application) {
      throw createHttpError(404, "Application not found.");
    }

    return application;
  },

  editById: async (id: string, data: EditApplicationDTO) => {
    // Reassigning to a new consultant must still land on an active one.
    if (data.consultantId) {
      await assertActiveConsultant(data.consultantId);
    }

    const [application] = await db
      .update(applicationsTable)
      .set(data)
      .where(
        and(eq(applicationsTable.id, id), isNull(applicationsTable.deletedAt)),
      )
      .returning();

    if (!application) {
      throw createHttpError(404, "Application not found.");
    }

    return application;
  },

  editByIdForConsultant: async (
    id: string,
    consultantId: string,
    data: ConsultantEditApplicationDTO,
  ) => {
    const [application] = await db
      .update(applicationsTable)
      .set(data)
      .where(
        and(
          eq(applicationsTable.id, id),
          eq(applicationsTable.consultantId, consultantId),
          isNull(applicationsTable.deletedAt),
        ),
      )
      .returning();

    if (!application) {
      throw createHttpError(404, "Application not found.");
    }

    return application;
  },

  // Hands every active application of the student over to their newly assigned
  // consultant. Called by the assignments module inside its own transaction so
  // the assignment insert and the handover commit (or roll back) together. The
  // old consultant loses access automatically: all their queries are scoped by
  // consultantId, which no longer matches.
  reassignAllForStudent: async (
    studentId: string,
    consultantId: string,
    executor: DbExecutor = db,
  ) => {
    return executor
      .update(applicationsTable)
      .set({ consultantId })
      .where(
        and(
          eq(applicationsTable.studentId, studentId),
          isNull(applicationsTable.deletedAt),
        ),
      )
      .returning({ id: applicationsTable.id });
  },

  softDeleteById: async (id: string) => {
    const [application] = await db
      .update(applicationsTable)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(applicationsTable.id, id), isNull(applicationsTable.deletedAt)),
      )
      .returning();

    if (!application) {
      throw createHttpError(404, "Application not found.");
    }

    return application;
  },

  hardDeleteById: async (id: string) => {
    const [application] = await db
      .delete(applicationsTable)
      .where(eq(applicationsTable.id, id))
      .returning();

    if (!application) {
      throw createHttpError(404, "Application not found.");
    }

    return application;
  },
};
