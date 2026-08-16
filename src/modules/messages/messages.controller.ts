import type { Request, Response, NextFunction } from "express";
import type { User } from "../../db/types.js";

import { messagesService } from "./messages.service.js";
import type { PaginationParams } from "../../lib/validators.js";
import type {
  BaseMessagesParams,
  DeleteMessageParams,
  EditMessageDTO,
  EditMessageParams,
  SendMessageDTO,
} from "./messages.types.js";
import { getIo } from "../../lib/socket.js";

export const messagesController = {
  listMessages: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: currentUserId } = req.user! as User;
      const { conversationId } = req.params as BaseMessagesParams;
      const { page, limit } = req.query as unknown as PaginationParams;

      const messages = await messagesService.listMessages(
        currentUserId,
        conversationId,
        page,
        limit,
      );
      res.json(messages);
    } catch (error) {
      next(error);
    }
  },
  sendMessage: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: currentUserId } = req.user! as User;
      const { conversationId } = req.params as BaseMessagesParams;
      const { body } = req.body as SendMessageDTO;

      const message = await messagesService.sendMessage(
        currentUserId,
        conversationId,
        body,
      );

      if (message) {
        const io = getIo();
        io.to(`conversation:${conversationId}`).emit("message:new", message);
      }

      res.json(message);
    } catch (error) {
      next(error);
    }
  },
  editMessage: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: currentUserId } = req.user! as User;
      const { conversationId, id: messageId } = req.params as EditMessageParams;
      const { body } = req.body as EditMessageDTO;

      const message = await messagesService.editMessage(
        currentUserId,
        conversationId,
        messageId,
        body,
      );

      const io = getIo();
      io.to(`conversation:${conversationId}`).emit("message:edit", message);

      res.json(message);
    } catch (error) {
      next(error);
    }
  },

  softDeleteMessage: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id: currentUserId } = req.user! as User;
      const { conversationId, id: messageId } =
        req.params as DeleteMessageParams;

      const message = await messagesService.softDeleteMessage(
        currentUserId,
        conversationId,
        messageId,
      );

      const io = getIo();
      io.to(`conversation:${conversationId}`).emit("message:delete", message);

      res.json(message);
    } catch (error) {
      next(error);
    }
  },
  hardDeleteMessage: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id: currentUserId } = req.user! as User;
      const { conversationId, id: messageId } =
        req.params as DeleteMessageParams;

      const message = await messagesService.hardDeleteMessage(
        currentUserId,
        conversationId,
        messageId,
      );
      res.json(message);
    } catch (error) {
      next(error);
    }
  },
};
