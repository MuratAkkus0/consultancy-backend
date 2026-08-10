import { db } from "../../db/db.js";
import { and, desc, eq, isNull } from "drizzle-orm";
import { messagesTable } from "../../db/index.js";
import { assertConversationMembership } from "../conversations/conversations.helpers.js";
import { conversationsService } from "../conversations/conversations.service.js";
import createHttpError from "http-errors";
import { userIdentityColumns } from "../../db/selections.js";

export const messagesService = {
  listMessages: async (
    currentUserId: string,
    conversationId: string,
    page: number,
    limit: number,
  ) => {
    const offset = (page - 1) * limit;

    await assertConversationMembership(currentUserId, conversationId);

    const where = and(
      eq(messagesTable.conversationId, conversationId),
      isNull(messagesTable.deletedAt),
    );

    const [data, total] = await Promise.all([
      db.query.messagesTable.findMany({
        offset,
        limit,
        orderBy: (t) => desc(t.createdAt),
        where,
        with: {
          sender: { columns: userIdentityColumns },
        },
      }),
      db.$count(messagesTable, where),
    ]);

    return { data, pagination: { page, total, limit } };
  },
  sendMessage: async (
    currentUserId: string,
    conversationId: string,
    body: string,
  ) => {
    const message = await db.transaction(async (tx) => {
      await assertConversationMembership(currentUserId, conversationId, tx);

      const [sentMessage] = await tx
        .insert(messagesTable)
        .values({ conversationId, senderId: currentUserId, body })
        .returning();

      await conversationsService.touchConversation(conversationId, tx);

      return sentMessage;
    });

    return message;
  },
  editMessage: async (
    currentUserId: string,
    conversationId: string,
    messageId: string,
    body: string,
  ) => {
    await assertConversationMembership(currentUserId, conversationId);

    const [message] = await db
      .update(messagesTable)
      .set({ body })
      .where(
        and(
          eq(messagesTable.conversationId, conversationId),
          eq(messagesTable.id, messageId),
          eq(messagesTable.senderId, currentUserId),
          isNull(messagesTable.deletedAt),
        ),
      )
      .returning();

    if (!message) throw createHttpError(404, "Message not found.");

    return message;
  },
  softDeleteMessage: async (
    currentUserId: string,
    conversationId: string,
    messageId: string,
  ) => {
    await assertConversationMembership(currentUserId, conversationId);

    const [message] = await db
      .update(messagesTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(messagesTable.conversationId, conversationId),
          eq(messagesTable.id, messageId),
          eq(messagesTable.senderId, currentUserId),
          isNull(messagesTable.deletedAt),
        ),
      )
      .returning();

    if (!message) throw createHttpError(404, "Message not found.");

    return message;
  },
  hardDeleteMessage: async (
    currentUserId: string,
    conversationId: string,
    messageId: string,
  ) => {
    await assertConversationMembership(currentUserId, conversationId);

    const [message] = await db
      .delete(messagesTable)
      .where(
        and(
          eq(messagesTable.conversationId, conversationId),
          eq(messagesTable.id, messageId),
          eq(messagesTable.senderId, currentUserId),
        ),
      )
      .returning();

    if (!message) throw createHttpError(404, "Message not found.");

    return message;
  },
};
