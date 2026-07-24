import { and, eq, inArray, isNull } from "drizzle-orm";
import createHttpError from "http-errors";
import {
  coursesTable,
  db,
  studentCoursesTable,
  users,
} from "../../db/index.js";
import { userIdentityColumns } from "../../db/selections.js";
import type {
  ConsultantEditCourseDTO,
  CreateCourseDTO,
  EditCourseDTO,
} from "./courses.types.js";

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

export const coursesService = {
  create: async (data: CreateCourseDTO) => {
    if (data.consultantId) {
      await assertActiveConsultant(data.consultantId);
    }

    const [course] = await db.insert(coursesTable).values(data).returning();
    return course;
  },

  list: async (page: number, limit: number, consultantId?: string) => {
    const offset = (page - 1) * limit;

    const where = consultantId
      ? and(
          isNull(coursesTable.deletedAt),
          eq(coursesTable.consultantId, consultantId),
        )
      : isNull(coursesTable.deletedAt);

    const [data, total] = await Promise.all([
      db.query.coursesTable.findMany({
        limit,
        offset,
        where,
        orderBy: (courses, { desc }) => [desc(courses.createdAt)],
        with: {
          consultant: { columns: userIdentityColumns },
        },
      }),
      db.$count(coursesTable, where),
    ]);

    return { data, total };
  },

  listForConsultant: async (
    page: number,
    limit: number,
    consultantId: string,
  ) => {
    const offset = (page - 1) * limit;

    const where = and(
      isNull(coursesTable.deletedAt),
      eq(coursesTable.consultantId, consultantId),
    );

    const [data, total] = await Promise.all([
      db.query.coursesTable.findMany({
        limit,
        offset,
        where,
        orderBy: (courses, { desc }) => [desc(courses.createdAt)],
        with: {
          students: {
            where: isNull(studentCoursesTable.deletedAt),
            columns: {},
            with: {
              student: {
                columns: userIdentityColumns,
              },
            },
          },
        },
      }),
      db.$count(coursesTable, where),
    ]);

    return { data, total };
  },
  listForStudent: async (page: number, limit: number, studentId: string) => {
    const offset = (page - 1) * limit;

    const enrolledCourseIds = db
      .select({ id: studentCoursesTable.courseId })
      .from(studentCoursesTable)
      .where(
        and(
          eq(studentCoursesTable.studentId, studentId),
          isNull(studentCoursesTable.deletedAt),
        ),
      );

    const where = and(
      isNull(coursesTable.deletedAt),
      inArray(coursesTable.id, enrolledCourseIds),
    );

    const [data, total] = await Promise.all([
      db.query.coursesTable.findMany({
        limit,
        offset,
        where,
        orderBy: (courses, { desc }) => [desc(courses.createdAt)],
        columns: { consultantNotes: false },
        with: { consultant: { columns: userIdentityColumns } },
      }),
      db.$count(coursesTable, where),
    ]);

    return { data, total };
  },

  getById: async (courseId: string) => {
    const course = await db.query.coursesTable.findFirst({
      where: and(eq(coursesTable.id, courseId), isNull(coursesTable.deletedAt)),
      with: {
        consultant: { columns: userIdentityColumns },
        students: {
          where: isNull(studentCoursesTable.deletedAt),
          with: {
            student: { columns: userIdentityColumns },
          },
        },
      },
    });

    if (!course) {
      throw createHttpError(404, "Course not found.");
    }

    return { ...course, enrolledStudentCount: course.students.length };
  },

  getByIdForConsultant: async (consultantId: string, courseId: string) => {
    const course = await db.query.coursesTable.findFirst({
      where: and(
        eq(coursesTable.id, courseId),
        eq(coursesTable.consultantId, consultantId),
        isNull(coursesTable.deletedAt),
      ),
      with: {
        students: {
          where: isNull(studentCoursesTable.deletedAt),
          with: {
            student: { columns: userIdentityColumns },
          },
        },
      },
    });

    if (!course) {
      throw createHttpError(404, "Course not found.");
    }

    return { ...course, enrolledStudentCount: course.students.length };
  },

  editById: async (id: string, data: EditCourseDTO) => {
    if (data.consultantId) {
      await assertActiveConsultant(data.consultantId);
    }

    const [course] = await db
      .update(coursesTable)
      .set(data)
      .where(and(eq(coursesTable.id, id), isNull(coursesTable.deletedAt)))
      .returning();

    if (!course) {
      throw createHttpError(404, "Course not found.");
    }

    return course;
  },

  editByIdForConsultant: async (
    id: string,
    consultantId: string,
    data: ConsultantEditCourseDTO,
  ) => {
    const [course] = await db
      .update(coursesTable)
      .set({ ...data })
      .where(
        and(
          eq(coursesTable.id, id),
          eq(coursesTable.consultantId, consultantId),
          isNull(coursesTable.deletedAt),
        ),
      )
      .returning();

    if (!course) {
      throw createHttpError(404, "Course not found.");
    }

    return course;
  },

  softDeleteById: async (id: string) => {
    const [course] = await db
      .update(coursesTable)
      .set({ deletedAt: new Date() })
      .where(and(eq(coursesTable.id, id), isNull(coursesTable.deletedAt)))
      .returning();

    if (!course) {
      throw createHttpError(404, "Course not found.");
    }

    return course;
  },

  hardDeleteById: async (id: string) => {
    const [course] = await db
      .delete(coursesTable)
      .where(eq(coursesTable.id, id))
      .returning();

    if (!course) {
      throw createHttpError(404, "Course not found.");
    }

    return course;
  },

  enrollStudent: async (courseId: string, studentId: string) => {
    const course = await db.query.coursesTable.findFirst({
      where: and(eq(coursesTable.id, courseId), isNull(coursesTable.deletedAt)),
      columns: { id: true },
    });

    if (!course) {
      throw createHttpError(404, "Course not found.");
    }

    const student = await db.query.users.findFirst({
      where: and(
        eq(users.id, studentId),
        eq(users.role, "student"),
        eq(users.status, "active"),
      ),
      columns: { id: true },
    });

    if (!student) {
      throw createHttpError(404, "Student not found.");
    }

    const [enrollment] = await db
      .insert(studentCoursesTable)
      .values({ courseId, studentId })
      .returning();

    return enrollment;
  },

  unenrollStudent: async (courseId: string, studentId: string) => {
    const [enrollment] = await db
      .update(studentCoursesTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(studentCoursesTable.courseId, courseId),
          eq(studentCoursesTable.studentId, studentId),
          isNull(studentCoursesTable.deletedAt),
        ),
      )
      .returning();

    if (!enrollment) {
      throw createHttpError(404, "Enrollment not found.");
    }

    return enrollment;
  },
};
