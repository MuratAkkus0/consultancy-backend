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

// Drizzle wraps the pg DatabaseError in DrizzleQueryError; the original error
// (with its Postgres code) is kept on `cause`, so walk the chain.
const hasPgErrorCode = (err: unknown, code: string): boolean => {
  if (typeof err !== "object" || err === null) {
    return false;
  }
  if ("code" in err && err.code === code) {
    return true;
  }
  return "cause" in err && hasPgErrorCode(err.cause, code);
};

// 23505 unique_violation
export const isUniqueViolation = (err: unknown): boolean =>
  hasPgErrorCode(err, "23505");

// 23503 foreign_key_violation (e.g. a languageId/countryId that doesn't exist)
export const isForeignKeyViolation = (err: unknown): boolean =>
  hasPgErrorCode(err, "23503");

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
      .where(
        and(
          eq(users.id, userId),
          eq(users.role, userRole),
          ne(users.status, "deleted"),
        ),
      )
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

// Account closure (recoverable). Mirrors anonymizeUser, but keeps identity
// (email/phone stay on the user row) and only marks things deleted instead of
// scrubbing them: status -> soft_deleted, sessions dropped, documents removed
// and queued for S3 cleanup, and the role profile is soft-deleted (a student
// also has its passport number cleared). No admin branch: closure is only for
// students and consultants, exactly like anonymizeUser.
export const softDeleteUser = async (userId: string, userRole: UserRole) => {
  return await db.transaction(async (tx) => {
    const [user] = await tx
      .update(users)
      .set({ status: "soft_deleted" })
      .where(
        and(
          eq(users.id, userId),
          eq(users.role, userRole),
          ne(users.status, "deleted"),
          ne(users.status, "soft_deleted"),
        ),
      )
      .returning();

    if (!user) {
      throw createHttpError(404, "User not found.");
    }

    await tx.delete(sessions).where(eq(sessions.userId, userId));

    const documents = await tx
      .delete(documentsTable)
      .where(eq(documentsTable.studentId, userId))
      .returning({ documentKey: documentsTable.documentKey });

    const keys = documents.map((doc) => doc.documentKey);
    await addS3DocumentsToDeletionQueue(keys, tx);

    let profile:
      | typeof studentProfilesTable.$inferSelect
      | typeof consultantProfilesTable.$inferSelect
      | undefined;

    if (userRole === "student") {
      [profile] = await tx
        .update(studentProfilesTable)
        .set({ passportNumber: null, deletedAt: new Date() })
        .where(eq(studentProfilesTable.userId, userId))
        .returning();
    } else if (userRole === "consultant") {
      [profile] = await tx
        .update(consultantProfilesTable)
        .set({ deletedAt: new Date() })
        .where(eq(consultantProfilesTable.userId, userId))
        .returning();
    }

    return { user, profile };
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
