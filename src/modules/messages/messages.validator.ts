import z from "zod";

export const baseMessagesParamsSchema = z.object({
  conversationId: z.uuid(),
});

export const editMessageParamsSchema = baseMessagesParamsSchema.extend({
  id: z.uuid(),
});

export const deleteMessageParamsSchema = baseMessagesParamsSchema.extend({
  id: z.uuid(),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1),
});

export const editMessageSchema = z.object({
  body: z.string().min(1),
});
