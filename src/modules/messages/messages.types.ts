import type z from "zod";
import type {
  baseMessagesParamsSchema,
  deleteMessageParamsSchema,
  editMessageParamsSchema,
  editMessageSchema,
  sendMessageSchema,
} from "./messages.validator.js";

export type BaseMessagesParams = z.infer<typeof baseMessagesParamsSchema>;
export type EditMessageParams = z.infer<typeof editMessageParamsSchema>;
export type DeleteMessageParams = z.infer<typeof deleteMessageParamsSchema>;

export type SendMessageDTO = z.infer<typeof sendMessageSchema>;
export type EditMessageDTO = z.infer<typeof editMessageSchema>;
