import { db } from "../../db/db.js";
import { consultantProfilesTable, users } from "../../db/index.js";
import { auth } from "../../lib/auth.js";
import type {
  CreateConsultantDTO,
  EditConsultantDTO,
} from "./consultants.types.js";
import { and, eq, isNull, ne } from "drizzle-orm";
import createHttpError from "http-errors";

export const consultantsService = {
  create: async (data: CreateConsultantDTO) => {
    const { email, firstName, lastName, maxActiveStudents, password, phone } =
      data;
    // create user with better-auth

    const [consultant] = await db.transaction(async (tx) => {
      const { user } = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: `${firstName} ${lastName}`,
          firstName,
          lastName,
          phone,
        },
      });

      // Set role to consultant
      const consultant = await tx
        .update(users)
        .set({ role: "consultant" })
        .where(eq(users.id, user.id))
        .returning();

      // create consultant profile
      await tx.insert(consultantProfilesTable).values({
        userId: user.id,
        maxActiveStudents,
      });
      return consultant;
    });

    return consultant;
  },
  list: async (page: number, limit: number) => {
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      db.query.users.findMany({
        limit,
        offset,
        orderBy: (table, { asc }) => asc(table.createdAt),
        with: {
          consultantProfile: true,
        },
        where: (table, { eq }) => eq(table.role, "consultant"),
      }),
      db.$count(consultantProfilesTable),
    ]);

    return { data, total };
  },
  editById: async (id: string, data: EditConsultantDTO) => {
    const user = await db.query.users.findFirst({
      where: (table, { eq, and }) =>
        and(eq(table.id, id), eq(table.status, "active")),
      with: {
        consultantProfile: true,
      },
    });

    if (!user || user?.role !== "consultant") {
      throw createHttpError(404, "User not found.");
    }

    const updatedUser = await db.transaction(async (tx) => {
      if (data.user && Object.keys(data.user).length) {
        await tx
          .update(users)
          .set({
            ...data.user,
            name: `${data.user.firstName ?? user.firstName} ${data.user.lastName ?? user.lastName}`,
          })
          .where(and(eq(users.id, id), eq(users.status, "active")));
      }
      if (
        data.consultantProfile &&
        Object.keys(data.consultantProfile).length
      ) {
        await tx
          .update(consultantProfilesTable)
          .set(data.consultantProfile)
          .where(
            and(
              eq(consultantProfilesTable.userId, id),
              isNull(consultantProfilesTable.deletedAt),
            ),
          );
      }
      const updated = await tx.query.users.findFirst({
        where: (table, { eq }) => eq(table.id, id),
        with: {
          consultantProfile: true,
        },
      });

      return updated;
    });

    return updatedUser;
  },
  getById: async (id: string) => {
    const user = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.id, id),
      with: {
        consultantProfile: true,
      },
    });

    if (!user || user?.role !== "consultant") {
      throw createHttpError(404, "User not found.");
    }

    return user;
  },
  softDeleteById: async (id: string) => {
    const result = await db.transaction(async (tx) => {
      const user = await tx.query.users.findFirst({
        where: (table, { eq, and, ne }) =>
          and(eq(table.id, id), ne(table.status, "deleted")),
        with: {
          consultantProfile: true,
        },
      });

      if (!user || user?.role !== "consultant") {
        throw createHttpError(404, "User not found.");
      }

      const [deletedConsultant] = await tx
        .update(users)
        .set({ status: "deleted" })
        .where(and(eq(users.id, id), ne(users.status, "deleted")))
        .returning();

      const [deletedConsultantProfile] = await tx
        .update(consultantProfilesTable)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(consultantProfilesTable.userId, id),
            isNull(consultantProfilesTable.deletedAt),
          ),
        )
        .returning();

      return { ...deletedConsultantProfile, user: deletedConsultant };
    });
    return result;
  },
  hardDeleteById: async (id: string) => {
    const user = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.id, id),
    });

    if (!user || user?.role !== "consultant") {
      throw createHttpError(404, "User not found.");
    }

    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, user.id))
      .returning();
    return deletedUser;
  },
  inactivateById: async (id: string) => {
    const user = await db.query.users.findFirst({
      where: (table, { eq, and }) =>
        and(eq(table.id, id), eq(table.status, "active")),
    });

    if (!user || user?.role !== "consultant") {
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

    if (!user || user?.role !== "consultant") {
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
