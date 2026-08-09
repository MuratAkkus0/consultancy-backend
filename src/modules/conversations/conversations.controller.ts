import type { Request, Response, NextFunction } from "express";
import type { User } from "../../db/types.js";
import type { CreateDirectConversationDTO } from "./conversations.types.js";
import { conversationsService } from "./conversations.service.js";
import type { PaginationParams, UuidParam } from "../../lib/validators.js";
import { isUniqueViolation } from "../../lib/service-helpers.js";
import createHttpError from "http-errors";

export const conversationsController = {
  listDirectConversations: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id: currentUserId } = req.user! as User;
      const { page, limit } = req.query as unknown as PaginationParams;
      const conversations = await conversationsService.listConversations(
        currentUserId,
        page,
        limit,
      );
      res.json(conversations);
    } catch (error) {
      next(error);
    }
  },
  createDirectConversation: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id: currentUserId } = req.user! as User;
      const { otherUserId } = req.body as CreateDirectConversationDTO;

      if (currentUserId === otherUserId) {
        throw createHttpError(
          400,
          "You cannot start a conversation with yourself.",
        );
      }

      const conversation = await conversationsService.createDirectConversation(
        currentUserId,
        otherUserId,
      );
      res.json(conversation);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return next(
          createHttpError(409, "A conversation with this pair already exists."),
        );
      }
      next(error);
    }
  },
  getDirectConversation: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id: currentUserId } = req.user! as User;
      const { id: conversationId } = req.params as UuidParam;
      const conversation = await conversationsService.getDirectConversation(
        currentUserId,
        conversationId,
      );
      res.json(conversation);
    } catch (error) {
      next(error);
    }
  },
  softDeleteDirectConversation: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id: currentUserId } = req.user! as User;
      const { id: conversationId } = req.params as UuidParam;
      const conversation =
        await conversationsService.softDeleteDirectConversation(
          currentUserId,
          conversationId,
        );
      res.json(conversation);
    } catch (error) {
      next(error);
    }
  },
  hardDeleteDirectConversation: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id: conversationId } = req.params as UuidParam;
      const conversation =
        await conversationsService.hardDeleteDirectConversation(conversationId);
      res.json(conversation);
    } catch (error) {
      next(error);
    }
  },
};
