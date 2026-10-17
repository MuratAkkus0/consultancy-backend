import { and, eq, isNull, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import {
  adminProfilesTable,
  consultantProfilesTable,
  db,
  pushSubscriptionsTable,
  studentProfilesTable,
  users,
} from "../../db/index.js";
import type { UserRole } from "../../db/types.js";
import type {
  CreatePushSubscriptionDTO,
  EditAdminSelfDTO,
  EditConsultantSelfDTO,
  EditSelfDTO,
  EditStudentSelfDTO,
} from "./me.types.js";
import { anonymizeUser, softDeleteUser } from "../../lib/service-helpers.js";

const hasKeys = (obj: object | undefined): obj is object =>
  obj !== undefined && Object.keys(obj).length > 0;

export const meService = {
  getByUserId: async (userId: string) => {
    const user = await db.query.users.findFirst({
      where: (table, { eq, and }) =>
        and(eq(table.id, userId), eq(table.status, "active")),
      with: {
        adminProfile: true,
        consultantProfile: true,
        studentProfile: true,
      },
    });

    if (!user) {
      throw createHttpError(404, "User not found.");
    }

    return user;
  },

  editOwnProfile: async (userId: string, role: UserRole, data: EditSelfDTO) => {
    const updated = await db.transaction(async (tx) => {
      // Shared identity fields on the `users` table.
      if (hasKeys(data.user)) {
        await tx.update(users).set(data.user).where(eq(users.id, userId));
      }

      // Role-specific profile table.
      if (role === "student") {
        const { studentProfile } = data as EditStudentSelfDTO;
        if (hasKeys(studentProfile)) {
          await tx
            .update(studentProfilesTable)
            .set(studentProfile)
            .where(
              and(
                eq(studentProfilesTable.userId, userId),
                isNull(studentProfilesTable.deletedAt),
              ),
            );
        }
      } else if (role === "consultant") {
        const { consultantProfile } = data as EditConsultantSelfDTO;
        if (hasKeys(consultantProfile)) {
          await tx
            .update(consultantProfilesTable)
            .set(consultantProfile)
            .where(
              and(
                eq(consultantProfilesTable.userId, userId),
                isNull(consultantProfilesTable.deletedAt),
              ),
            );
        }
      } else if (role === "admin") {
        const { adminProfile } = data as EditAdminSelfDTO;
        if (hasKeys(adminProfile)) {
          await tx
            .update(adminProfilesTable)
            .set(adminProfile)
            .where(
              and(
                eq(adminProfilesTable.userId, userId),
                isNull(adminProfilesTable.deletedAt),
              ),
            );
        }
      }

      return tx.query.users.findFirst({
        where: (table, { eq }) => eq(table.id, userId),
        with: {
          adminProfile: true,
          consultantProfile: true,
          studentProfile: true,
        },
      });
    });

    return updated;
  },
  softDeleteById: async (id: string, userRole: UserRole) => {
    return await softDeleteUser(id, userRole);
  },

  hardDeleteById: async (id: string, userRole: UserRole) => {
    const user = await anonymizeUser(id, userRole);

    return user;
  },

  // An endpoint identifies one browser install, so a re-registration (shared
  // device, re-login as another user) takes the row over instead of failing.
  upsertPushSubscription: async (
    userId: string,
    data: CreatePushSubscriptionDTO,
    userAgent: string | undefined,
  ) => {
    const truncatedAgent = userAgent?.slice(0, 512);
    const values = {
      userId,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
      expirationTime:
        typeof data.expirationTime === "number"
          ? new Date(data.expirationTime)
          : null,
    };

    // xmax is 0 only on a freshly inserted row.
    const [row] = await db
      .insert(pushSubscriptionsTable)
      .values({
        endpoint: data.endpoint,
        ...values,
        userAgent: truncatedAgent ?? null,
      })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        // A re-registration without a User-Agent keeps the stored one.
        set: userAgent ? { ...values, userAgent: truncatedAgent } : values,
      })
      .returning({ created: sql<boolean>`(xmax = 0)` });

    return { created: row!.created };
  },

  deletePushSubscription: async (userId: string, endpoint: string) => {
    await db
      .delete(pushSubscriptionsTable)
      .where(
        and(
          eq(pushSubscriptionsTable.userId, userId),
          eq(pushSubscriptionsTable.endpoint, endpoint),
        ),
      );
  },
};
