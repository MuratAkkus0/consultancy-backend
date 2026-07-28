import { and, eq, isNull, ne } from "drizzle-orm";
import { consultantAssignmentsTable, db, users } from "../../db/index.js";
import { userIdentityColumns } from "../../db/selections.js";
import createHttpError from "http-errors";
import { anonymizeUser, softDeleteUser } from "../../lib/service-helpers.js";

export const studentsService = {
  list: async (page: number, limit: number) => {
    const offset = (page - 1) * limit;

    const where = and(
      ne(users.status, "deleted"),
      ne(users.status, "soft_deleted"),
      eq(users.role, "student"),
    );

    const [data, total] = await Promise.all([
      db.query.users.findMany({
        limit,
        offset,
        orderBy: (table, { asc, desc }) => [
          asc(table.status),
          desc(table.createdAt),
        ],
        where,
        with: {
          studentProfile: true,
        },
      }),
      db.$count(users, where),
    ]);

    return { data, total };
  },

  getById: async (id: string) => {
    const student = await db.query.users.findFirst({
      columns: userIdentityColumns,
      where: (table, { and, eq, ne }) =>
        and(
          eq(table.id, id),
          ne(table.status, "soft_deleted"),
          ne(table.status, "deleted"),
          eq(table.role, "student"),
        ),
      with: {
        studentProfile: {
          with: {
            targetCountries: { with: { country: true } },
            languages: { with: { language: true } },
          },
        },
      },
    });

    return student ?? null;
  },

  // Ownership is enforced in the WHERE: the profile is returned only when its
  // user is actively assigned to this consultant. Anything else falls through
  // to the controller's 404, which doesn't reveal whether the student exists.
  getByIdForConsultant: async (consultantId: string, id: string) => {
    const assignedStudentIds = db
      .select({ id: consultantAssignmentsTable.studentId })
      .from(consultantAssignmentsTable)
      .where(
        and(
          eq(consultantAssignmentsTable.consultantId, consultantId),
          isNull(consultantAssignmentsTable.deletedAt),
        ),
      );

    const student = await db.query.users.findFirst({
      columns: userIdentityColumns,
      where: (table, { and, eq, inArray }) =>
        and(
          eq(table.id, id),
          eq(table.status, "active"),
          inArray(table.id, assignedStudentIds),
          eq(table.role, "student"),
        ),
      with: {
        studentProfile: {
          with: {
            targetCountries: { with: { country: true } },
            languages: { with: { language: true } },
          },
        },
      },
    });

    return student ?? null;
  },
  softDeleteById: async (id: string) => {
    return await softDeleteUser(id, "student");
  },
  hardDeleteById: async (id: string) => {
    const deletedUser = await anonymizeUser(id, "student");

    return deletedUser;
  },
  inactivateById: async (id: string) => {
    const user = await db.query.users.findFirst({
      where: (table, { eq, and }) =>
        and(eq(table.id, id), eq(table.status, "active")),
    });

    if (!user || user?.role !== "student") {
      throw createHttpError(404, "User not found.");
    }

    const [inactivatedUser] = await db
      .update(users)
      .set({ status: "inactive" })
      .where(eq(users.id, id))
      .returning();

    return inactivatedUser;
  },
  activateById: async (id: string) => {
    const user = await db.query.users.findFirst({
      where: (table, { eq, and }) =>
        and(eq(table.id, id), eq(table.status, "inactive")),
    });

    if (!user || user?.role !== "student") {
      throw createHttpError(404, "User not found.");
    }

    const [activatedUser] = await db
      .update(users)
      .set({ status: "active" })
      .where(eq(users.id, id))
      .returning();

    return activatedUser;
  },
};
