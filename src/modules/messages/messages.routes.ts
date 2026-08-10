import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { registerRoute } from "../../lib/openapi.js";
import { messagesController } from "./messages.controller.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middleware/validate.middleware.js";

import {
  baseMessagesParamsSchema,
  editMessageParamsSchema,
  editMessageSchema,
  sendMessageSchema,
  deleteMessageParamsSchema,
} from "./messages.validator.js";
import { paginationSchema } from "../../lib/validators.js";

const router = Router({ mergeParams: true });

// Messages live under a conversation, so every path is scoped by
// conversationId. Only the two participants of a conversation (an assigned
// consultant and their student) can act on it; anything else is a 404.
const AUTH_ERRORS = {
  401: { description: "Not authenticated" },
  403: { description: "Consultant or student role required" },
} as const;

// List a conversation's messages, newest first. Only a participant of the
// conversation may read it; otherwise the conversation is a 404.
registerRoute({
  method: "get",
  path: "/api/v1/conversations/:conversationId/messages",
  tags: ["Messages"],
  summary: "List a conversation's messages",
  description:
    "Returns the conversation's non-deleted messages, newest first, paginated. Each message includes its sender's identity. The caller must be a participant of the conversation.",
  request: { params: baseMessagesParamsSchema, query: paginationSchema },
  responses: {
    200: { description: "Paginated list of messages with senders" },
    404: { description: "Conversation not found" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/",
  requireAuth,
  requireRole("consultant", "student"),
  validateParams(baseMessagesParamsSchema),
  validateQuery(paginationSchema),
  messagesController.listMessages,
);

// Send a message into a conversation. The sender is taken from the session;
// the conversation's last-activity timestamp is bumped so it floats to the
// top of the participants' conversation lists.
registerRoute({
  method: "post",
  path: "/api/v1/conversations/:conversationId/messages",
  tags: ["Messages"],
  summary: "Send a message",
  description:
    "Creates a message in the conversation, authored by the current user, and refreshes the conversation's last-activity time. The caller must be a participant of the conversation.",
  request: { params: baseMessagesParamsSchema, body: sendMessageSchema },
  responses: {
    200: { description: "The created message" },
    400: { description: "Validation error" },
    404: { description: "Conversation not found" },
    ...AUTH_ERRORS,
  },
});
router.post(
  "/",
  requireAuth,
  requireRole("consultant", "student"),
  validateBody(sendMessageSchema),
  messagesController.sendMessage,
);

// Edit a message. A user can only edit their own message, and only within a
// conversation they belong to.
registerRoute({
  method: "patch",
  path: "/api/v1/conversations/:conversationId/messages/:id",
  tags: ["Messages"],
  summary: "Edit a message",
  description:
    "Updates the body of a message the current user authored. Editing another user's message, or a non-existent/deleted one, is a 404.",
  request: { params: editMessageParamsSchema, body: editMessageSchema },
  responses: {
    200: { description: "The updated message" },
    400: { description: "Validation error" },
    404: { description: "Message not found" },
    ...AUTH_ERRORS,
  },
});
router.patch(
  "/:id",
  requireAuth,
  requireRole("consultant", "student"),
  validateParams(editMessageParamsSchema),
  validateBody(editMessageSchema),
  messagesController.editMessage,
);

// Soft-delete a message - hidden from listings but kept in the table. A user
// can only delete their own message.
registerRoute({
  method: "delete",
  path: "/api/v1/conversations/:conversationId/messages/:id",
  tags: ["Messages"],
  summary: "Soft-delete a message",
  description:
    "Marks the current user's own message as deleted so it stops appearing in listings. Another user's message, or a non-existent one, is a 404.",
  request: { params: deleteMessageParamsSchema },
  responses: {
    200: { description: "The soft-deleted message" },
    404: { description: "Message not found" },
    ...AUTH_ERRORS,
  },
});
router.delete(
  "/:id",
  requireAuth,
  requireRole("consultant", "student"),
  validateParams(deleteMessageParamsSchema),
  messagesController.softDeleteMessage,
);

// Permanently delete a message - removes the row entirely. A user can only
// permanently delete their own message.
registerRoute({
  method: "delete",
  path: "/api/v1/conversations/:conversationId/messages/:id/permanent",
  tags: ["Messages"],
  summary: "Permanently delete a message",
  description:
    "Deletes the current user's own message row for good. Another user's message, or a non-existent one, is a 404.",
  request: { params: deleteMessageParamsSchema },
  responses: {
    200: { description: "The permanently deleted message" },
    404: { description: "Message not found" },
    ...AUTH_ERRORS,
  },
});
router.delete(
  "/:id/permanent",
  requireAuth,
  requireRole("consultant", "student"),
  validateParams(deleteMessageParamsSchema),
  messagesController.hardDeleteMessage,
);

export default router;
