import { and, asc, eq, inArray, lt, lte } from "drizzle-orm";
import { db } from "../../db/db.js";
import { s3DeletionQueuesTable } from "../../db/schema/s3_deletion_queues.js";
import { storage } from "../../lib/storage.js";

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000 * 60;
const LEASE_MS = BASE_DELAY_MS * 5;
const BATCH = 50;

const backoffMs = (attempts: number) => BASE_DELAY_MS * 2 ** attempts;

const claimBatch = async () => {
  const claimedRecords = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(s3DeletionQueuesTable)
      .where(
        and(
          lte(s3DeletionQueuesTable.nextAttemptAt, new Date()),
          lt(s3DeletionQueuesTable.attempts, MAX_ATTEMPTS),
        ),
      )
      .orderBy(asc(s3DeletionQueuesTable.createdAt))
      .limit(BATCH)
      .for("update", { skipLocked: true });

    if (rows.length) {
      await tx
        .update(s3DeletionQueuesTable)
        .set({
          nextAttemptAt: new Date(Date.now() + LEASE_MS),
        })
        .where(
          inArray(
            s3DeletionQueuesTable.id,
            rows.map((r) => r.id),
          ),
        );
    }
    return rows;
  });

  return claimedRecords;
};

export const processS3DeletionQueue = async () => {
  let processed = 0;

  for (;;) {
    const rows = await claimBatch();
    if (rows.length === 0) break;
    for (const row of rows) {
      try {
        await storage.deleteObject(row.objectKey);
        await db
          .delete(s3DeletionQueuesTable)
          .where(eq(s3DeletionQueuesTable.id, row.id));
        processed += 1;
      } catch (error) {
        await db
          .update(s3DeletionQueuesTable)
          .set({
            lastError: String(error),
            nextAttemptAt: new Date(Date.now() + backoffMs(row.attempts + 1)),
            attempts: row.attempts + 1,
          })
          .where(eq(s3DeletionQueuesTable.id, row.id));
      }
    }
  }
  return processed;
};
