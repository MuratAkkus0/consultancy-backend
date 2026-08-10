import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { registerRoute } from "../../lib/openapi.js";
import { conversationsController } from "./conversations.controller.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middleware/validate.middleware.js";
import { createDirectConversationSchema } from "./conversations.validator.js";
import { paginationSchema, uuidParamSchema } from "../../lib/validators.js";

const router = Router();

// Direct conversations exist only between an assigned consultant and their
// student; the caller is always one side, so every operation is scoped to
// conversations they belong to. Anything else is a 404.
const AUTH_ERRORS = {
  401: { description: "Not authenticated" },
  403: { description: "Consultant or student role required" },
} as const;

// Get a single conversation the caller belongs to.
registerRoute({
  method: "get",
  path: "/api/v1/conversations/:id",
  tags: ["Conversations"],
  summary: "Get a conversation",
  description:
    "Returns a conversation by id. The caller must be one of its two participants and the underlying consultant-student assignment must still be active; otherwise it is a 404.",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "The conversation" },
    404: { description: "Conversation not found" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/:id",
  requireAuth,
  requireRole("consultant", "student"),
  validateParams(uuidParamSchema),
  conversationsController.getDirectConversation,
);

// List the caller's conversations, most recently active first.
registerRoute({
  method: "get",
  path: "/api/v1/conversations",
  tags: ["Conversations"],
  summary: "List the caller's conversations",
  description:
    "Returns the conversations the current user participates in, ordered by last activity, paginated.",
  request: { query: paginationSchema },
  responses: {
    200: { description: "Paginated list of conversations" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/",
  requireAuth,
  requireRole("consultant", "student"),
  validateQuery(paginationSchema),
  conversationsController.listDirectConversations,
);

// Start (or fail on an existing) direct conversation with another user.
registerRoute({
  method: "post",
  path: "/api/v1/conversations",
  tags: ["Conversations"],
  summary: "Start a direct conversation",
  description:
    "Creates a direct conversation with otherUserId. The two users must be an actively assigned consultant-student pair, otherwise it is a 404. If a conversation between them already exists, responds 409.",
  request: { body: createDirectConversationSchema },
  responses: {
    200: { description: "The created conversation" },
    400: { description: "Validation error" },
    404: { description: "The other user is not an assigned counterpart" },
    409: { description: "A conversation between these users already exists" },
    ...AUTH_ERRORS,
  },
});
router.post(
  "/",
  requireAuth,
  requireRole("consultant", "student"),
  validateBody(createDirectConversationSchema),
  conversationsController.createDirectConversation,
);

// Soft-delete a conversation the caller belongs to.
registerRoute({
  method: "delete",
  path: "/api/v1/conversations/:id",
  tags: ["Conversations"],
  summary: "Soft-delete a conversation",
  description:
    "Marks a conversation the caller participates in as deleted so it stops appearing in listings. Anything else is a 404.",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "The soft-deleted conversation" },
    404: { description: "Conversation not found" },
    ...AUTH_ERRORS,
  },
});
router.delete(
  "/:id",
  requireAuth,
  requireRole("consultant", "student"),
  validateParams(uuidParamSchema),
  conversationsController.softDeleteDirectConversation,
);

// Permanently delete a conversation - admin only. Removes the row (and, via
// cascade, its messages) for good.
registerRoute({
  method: "delete",
  path: "/api/v1/conversations/:id/permanent",
  tags: ["Conversations"],
  summary: "Permanently delete a conversation",
  description:
    "Deletes the conversation row entirely; its messages are removed by cascade. Admin only.",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "The permanently deleted conversation" },
    403: { description: "Admin role required" },
    404: { description: "Conversation not found" },
    401: { description: "Not authenticated" },
  },
});
router.delete(
  "/:id/permanent",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  conversationsController.hardDeleteDirectConversation,
);

export default router;
