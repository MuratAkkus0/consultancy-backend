import z from "zod";

export const createDirectConversationSchema = z.object({
  otherUserId: z.uuid(),
});
