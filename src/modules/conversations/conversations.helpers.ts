import createHttpError from "http-errors";
import { db } from "../../db/db.js";
import type { DbExecutor } from "../../db/types.js";
import { or } from "drizzle-orm";

export const getDirectConversation = async (
  conversationId: string,
  executor: DbExecutor = db,
) => {
  const conversation = await executor.query.conversationsTable.findFirst({
    where: (t, { and, eq, isNull }) =>
      and(eq(t.id, conversationId), isNull(t.deletedAt)),
  });
  return conversation;
};

export const assertStudentAssignedToConsultant = async (
  currentUserId: string,
  otherUserId: string,
) => {
  const assignment = await db.query.consultantAssignmentsTable.findFirst({
    where: (t, { and, eq, isNull }) =>
      and(
        or(
          and(eq(t.consultantId, currentUserId), eq(t.studentId, otherUserId)),
          and(eq(t.consultantId, otherUserId), eq(t.studentId, currentUserId)),
        ),
        isNull(t.deletedAt),
      ),
  });

  if (!assignment) {
    throw createHttpError(404, "Conversation not found.");
  }
};

export async function assertConversationMembership(
  currentUserId: string,
  conversationId: string,
  executor: DbExecutor = db,
) {
  const conversation = await getDirectConversation(conversationId, executor);

  if (!conversation) {
    throw createHttpError(404, "Conversation not found.");
  }

  const { userAId, userBId } = conversation;

  if (userAId !== currentUserId && userBId !== currentUserId) {
    throw createHttpError(404, "Conversation not found.");
  }

  await assertStudentAssignedToConsultant(userAId, userBId);

  return conversation;
}
