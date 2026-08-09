import type z from "zod";
import type { createDirectConversationSchema } from "./conversations.validator.js";

export type CreateDirectConversationDTO = z.infer<
  typeof createDirectConversationSchema
>;
