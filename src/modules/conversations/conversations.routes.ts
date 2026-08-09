import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { conversationsController } from "./conversations.controller.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middleware/validate.middleware.js";
import { createDirectConversationSchema } from "./conversations.validator.js";
import { paginationSchema, uuidParamSchema } from "../../lib/validators.js";

const router = Router();

router.get(
  "/:id",
  requireAuth,
  requireRole("consultant", "student"),
  validateParams(uuidParamSchema),
  conversationsController.getDirectConversation,
);

router.get(
  "/",
  requireAuth,
  requireRole("consultant", "student"),
  validateQuery(paginationSchema),
  conversationsController.listDirectConversations,
);

router.post(
  "/",
  requireAuth,
  requireRole("consultant", "student"),
  validateBody(createDirectConversationSchema),
  conversationsController.createDirectConversation,
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("consultant", "student"),
  validateParams(uuidParamSchema),
  conversationsController.softDeleteDirectConversation,
);
router.delete(
  "/:id/permanent",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  conversationsController.hardDeleteDirectConversation,
);

export default router;
