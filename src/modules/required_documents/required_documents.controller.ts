import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import type { User } from "../../db/types.js";
import type { UuidParam } from "../../lib/validators.js";
import { isUniqueViolation } from "../../lib/service-helpers.js";
import { requiredDocumentsService } from "./required_documents.service.js";
import type {
  CreateRequiredDocumentDTO,
  RequiredDocumentQuery,
} from "./required_documents.types.js";

export const requiredDocumentsController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const data = req.body as unknown as CreateRequiredDocumentDTO;

      let requirement;
      if (user.role === "admin") {
        requirement = await requiredDocumentsService.assign(data, user.id);
      } else if (user.role === "consultant") {
        requirement = await requiredDocumentsService.assignForConsultant(
          user.id,
          data,
        );
      }

      res.status(201).json(requirement);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return next(
          createHttpError(409, "This document is already required for the student."),
        );
      }
      next(err);
    }
  },

  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const params = req.query as unknown as RequiredDocumentQuery;

      const data =
        user.role === "admin"
          ? await requiredDocumentsService.list(params)
          : await requiredDocumentsService.listForConsultant(user.id, params);

      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  removeById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const { id } = req.params as unknown as UuidParam;

      const requirement =
        user.role === "admin"
          ? await requiredDocumentsService.removeById(id)
          : await requiredDocumentsService.removeByIdForConsultant(user.id, id);

      res.json(requirement);
    } catch (err) {
      next(err);
    }
  },
};
