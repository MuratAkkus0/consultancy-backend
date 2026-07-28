import createHttpError from "http-errors";
import type { DbExecutor, User, UserRole } from "../db/types.js";
import { s3DeletionQueuesTable } from "../db/schema/s3_deletion_queues.js";
import { db } from "../db/db.js";
import {
  accounts,
  consultantProfilesTable,
  documentsTable,
  sessions,
  studentProfilesTable,
  users,
} from "../db/index.js";
import { and, eq, ne } from "drizzle-orm";

export function assertUserWithRole(
  user: User | undefined,
  role: UserRole,
): User | void {
  if (!user || user?.role !== role) {
    throw createHttpError(404, "User not found.");
  }
  return user;
}

export const isUniqueViolation = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  err.code === "23505";

export const anonymizeUser = async (userId: string, userRole: UserRole) => {
  return await db.transaction(async (tx) => {
    const [user] = await tx
      .update(users)
      .set({
        name: "Deleted User",
        firstName: "Deleted",
        lastName: "User",
        email: `deleted+${userId}@deleted.invalid`,
        emailVerified: false,
        phone: null,
        image: null,
        birthDate: null,
        status: "deleted",
      })
      .where(and(eq(users.id, userId), ne(users.status, "deleted")))
      .returning();

    if (!user) {
      throw createHttpError(404, "User not found.");
    }

    await tx.delete(accounts).where(eq(accounts.userId, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));

    const documents = await tx
      .delete(documentsTable)
      .where(eq(documentsTable.studentId, userId))
      .returning({ documentKey: documentsTable.documentKey });

    const keys = documents.map((doc) => doc.documentKey);

    await addS3DocumentsToDeletionQueue(keys, tx);

    if (userRole === "student") {
      await tx
        .delete(studentProfilesTable)
        .where(eq(studentProfilesTable.userId, userId));
    } else if (userRole === "consultant") {
      await tx
        .delete(consultantProfilesTable)
        .where(eq(consultantProfilesTable.userId, userId));
    }

    return user;
  });
};

export const addS3DocumentsToDeletionQueue = async (
  objectKeys: string[],
  executor: DbExecutor = db,
) => {
  if (!objectKeys.length) {
    return;
  }

  await executor
    .insert(s3DeletionQueuesTable)
    .values(objectKeys.map((objectKey) => ({ objectKey })));
};
