import { and, eq, isNull } from "drizzle-orm";
import createHttpError from "http-errors";
import {
  adminProfilesTable,
  consultantProfilesTable,
  db,
  documentsTable,
  sessions,
  studentProfilesTable,
  users,
} from "../../db/index.js";
import type { UserRole } from "../../db/types.js";
import type {
  EditAdminSelfDTO,
  EditConsultantSelfDTO,
  EditSelfDTO,
  EditStudentSelfDTO,
} from "./me.types.js";
import {
  addS3DocumentsToDeletionQueue,
  anonymizeUser,
} from "../../lib/service-helpers.js";

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
    const user = await db.transaction(async (tx) => {
      const [user] = await tx
        .update(users)
        .set({ status: "inactive" })
        .where(and(eq(users.id, id), eq(users.status, "active")))
        .returning();

      if (!user) {
        throw createHttpError(404, "User not found.");
      }

      await tx.delete(sessions).where(eq(sessions.userId, id));

      const documents = await tx
        .delete(documentsTable)
        .where(eq(documentsTable.studentId, user.id))
        .returning({ documentKey: documentsTable.documentKey });

      const keys = documents.map((d) => d.documentKey);
      await addS3DocumentsToDeletionQueue(keys, tx);

      if (userRole === "student") {
        await tx
          .update(studentProfilesTable)
          .set({ passportNumber: null })
          .where(eq(studentProfilesTable.userId, id));
      }

      return user;
    });

    return user;
  },

  hardDeleteById: async (id: string, userRole: UserRole) => {
    const user = await anonymizeUser(id, userRole);

    return user;
  },
};
