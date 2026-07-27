import type { NextFunction, Request, Response } from "express";
import type { User } from "../../db/types.js";
import type { UuidParam } from "../../lib/validators.js";
import { documentsService } from "./documents.service.js";
import type { DocumentQuery, ReviewDocumentDTO } from "./documents.types.js";

export const documentsController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const params = req.query as unknown as DocumentQuery;

      let result;
      if (user.role === "admin") {
        result = await documentsService.list(params);
      } else if (user.role === "consultant") {
        result = await documentsService.listForConsultant(user.id, params);
      }

      res.json({
        data: result?.data,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: result?.total,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  getDownloadUrl: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const user = req.user as User;

      let result;
      if (user.role === "admin") {
        result = await documentsService.getDownloadUrl(id);
      } else if (user.role === "consultant") {
        result = await documentsService.getDownloadUrlForConsultant(
          user.id,
          id,
        );
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  reviewById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const user = req.user as User;
      const data = req.body as unknown as ReviewDocumentDTO;

      const document = await documentsService.reviewByIdForConsultant(
        user.id,
        id,
        data,
      );
      res.json(document);
    } catch (err) {
      next(err);
    }
  },

  softDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const document = await documentsService.softDeleteById(id);
      res.json(document);
    } catch (err) {
      next(err);
    }
  },

  hardDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const document = await documentsService.hardDeleteById(id);
      res.json(document);
    } catch (err) {
      next(err);
    }
  },
};
