import createHttpError from "http-errors";
import { db } from "../../db/db.js";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { conversationsTable, type DbExecutor } from "../../db/index.js";

const getArrangedUserIds = (currentUserId: string, otherUserId: string) => {
  const [userAId, userBId] =
    currentUserId < otherUserId
      ? [currentUserId, otherUserId]
      : [otherUserId, currentUserId];
  return { userAId, userBId };
};

const getDirectConversation = async (
  conversationId: string,
  executor: DbExecutor = db,
) => {
  const conversation = await executor.query.conversationsTable.findFirst({
    where: (t, { and, eq, isNull }) =>
      and(eq(t.id, conversationId), isNull(t.deletedAt)),
  });
  return conversation;
};

const assertStudentAssignedToConsultant = async (
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

export const conversationsService = {
  listConversations: async (userId: string, page: number, limit: number) => {
    const offset = (page - 1) * limit;

    const where = and(
      or(
        eq(conversationsTable.userAId, userId),
        eq(conversationsTable.userBId, userId),
      ),
      isNull(conversationsTable.deletedAt),
    );

    const [data, total] = await Promise.all([
      db.query.conversationsTable.findMany({
        offset,
        limit,
        orderBy: (t) => desc(t.updatedAt),
        where,
      }),
      db.$count(conversationsTable, where),
    ]);

    return { data, total };
  },
  createDirectConversation: async (
    currentUserId: string,
    otherUserId: string,
  ) => {
    await assertStudentAssignedToConsultant(currentUserId, otherUserId);

    const { userAId, userBId } = getArrangedUserIds(currentUserId, otherUserId);

    const [conversation] = await db
      .insert(conversationsTable)
      .values({
        userAId,
        userBId,
      })
      .returning();

    return conversation;
  },
  getDirectConversation: async (
    currentUserId: string,
    conversationId: string,
  ) => {
    const conversation = await getDirectConversation(conversationId);

    if (!conversation) {
      throw createHttpError(404, "Conversation not found.");
    }

    const { userAId, userBId } = conversation;

    if (userAId !== currentUserId && userBId !== currentUserId) {
      throw createHttpError(404, "Conversation not found.");
    }

    await assertStudentAssignedToConsultant(userAId, userBId);

    return conversation;
  },
  softDeleteDirectConversation: async (
    currentUserId: string,
    conversationId: string,
  ) => {
    const conversation = await db.transaction(async (tx) => {
      const [currentConversation] = await tx
        .select({
          userAId: conversationsTable.userAId,
          userBId: conversationsTable.userBId,
        })
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.id, conversationId),
            isNull(conversationsTable.deletedAt),
          ),
        )
        .for("update");

      if (!currentConversation) {
        throw createHttpError(404, "Conversation not found.");
      }

      if (
        currentConversation.userAId !== currentUserId &&
        currentConversation.userBId !== currentUserId
      ) {
        throw createHttpError(404, "Conversation not found.");
      }

      const [conversation] = await tx
        .update(conversationsTable)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(conversationsTable.id, conversationId),
            isNull(conversationsTable.deletedAt),
          ),
        )
        .returning();

      return conversation;
    });
    return conversation;
  },
  hardDeleteDirectConversation: async (conversationId: string) => {
    const conversation = await db.transaction(async (tx) => {
      const [currentConversation] = await tx
        .select()
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.id, conversationId),
            isNull(conversationsTable.deletedAt),
          ),
        );

      if (!currentConversation) {
        throw createHttpError(404, "Conversation not found.");
      }

      const [conversation] = await tx
        .delete(conversationsTable)
        .where(and(eq(conversationsTable.id, conversationId)))
        .returning();

      return conversation;
    });
    return conversation;
  },
};
