import { z } from "zod";
import type { AppSocket } from "../../types/socket.js";
import { assertConversationMembership } from "./conversations.helpers.js";

type Ack = (res: { ok: boolean; error?: string }) => void;

const conversationIdSchema = z.uuid();

const joinConversation = async (
  socket: AppSocket,
  conversationId: string,
  ack: Ack,
) => {
  try {
    const parsed = conversationIdSchema.safeParse(conversationId);
    if (!parsed.success) {
      return ack({ ok: false, error: "conversationId must be a valid uuid." });
    }

    await assertConversationMembership(socket.data.user.id, parsed.data);

    await socket.join(`conversation:${parsed.data}`);

    ack({ ok: true });
  } catch (error) {
    ack({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not join the conversation.",
    });
  }
};

const leaveConversation = async (
  socket: AppSocket,
  conversationId: string,
  ack: Ack,
) => {
  const parsed = conversationIdSchema.safeParse(conversationId);
  if (!parsed.success) {
    return ack({ ok: false, error: "conversationId must be a valid uuid." });
  }

  await socket.leave(`conversation:${parsed.data}`);

  ack({ ok: true });
};

export const registerConversationsSocket = (socket: AppSocket) => {
  socket.on("conversation:join", (conversationId, ack) => {
    void joinConversation(socket, conversationId, ack);
  });

  socket.on("conversation:leave", (conversationId, ack) => {
    void leaveConversation(socket, conversationId, ack);
  });
};
