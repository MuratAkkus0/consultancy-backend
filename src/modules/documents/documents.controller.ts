import type { NextFunction, Request, Response } from "express";
import type { User } from "../../db/types.js";
import type { UuidParam } from "../../lib/validators.js";
import { documentsService } from "./documents.service.js";
import type {
  ConsultantCreateDocumentDTO,
  DocumentQuery,
  ReviewDocumentDTO,
} from "./documents.types.js";

export const documentsController = {
  // Start an upload into a student's area. An admin acts on any student; a
  // consultant only on a student assigned to them.
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const data = req.body as unknown as ConsultantCreateDocumentDTO;

      const result =
        user.role === "admin"
          ? await documentsService.createForAdmin(user.id, data)
          : await documentsService.createForConsultant(user.id, data);

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  // Confirm the upload succeeded (verified against S3). Admin any document; a
  // consultant only their own students' documents.
  confirm: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const { id } = req.params as unknown as UuidParam;

      const document =
        user.role === "admin"
          ? await documentsService.confirmUploadForAdmin(id)
          : await documentsService.confirmUploadForConsultant(user.id, id);

      res.json(document);
    } catch (err) {
      next(err);
    }
  },

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

  // Move a document's review status to accepted/rejected. Admin any document;
  // a consultant only documents of their own students.
  reviewById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const user = req.user as User;
      const data = req.body as unknown as ReviewDocumentDTO;

      const document =
        user.role === "admin"
          ? await documentsService.reviewById(id, data)
          : await documentsService.reviewByIdForConsultant(user.id, id, data);

      res.json(document);
    } catch (err) {
      next(err);
    }
  },

  softDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const user = req.user as User;

      const document =
        user.role === "admin"
          ? await documentsService.softDeleteById(id)
          : await documentsService.softDeleteByIdForConsultant(user.id, id);

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
