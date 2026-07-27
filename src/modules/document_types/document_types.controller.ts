import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import type { UuidParam } from "../../lib/validators.js";
import { isUniqueViolation } from "../../lib/service-helpers.js";
import { documentTypesService } from "./document_types.service.js";
import type {
  CreateDocumentTypeDTO,
  EditDocumentTypeDTO,
} from "./document_types.types.js";

export const documentTypesController = {
  list: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const documentTypes = await documentTypesService.list();
      res.json(documentTypes);
    } catch (err) {
      next(err);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as unknown as CreateDocumentTypeDTO;
      const documentType = await documentTypesService.create(data);
      res.status(201).json(documentType);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return next(
          createHttpError(409, "A document type with this code already exists."),
        );
      }
      next(err);
    }
  },

  editById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const data = req.body as unknown as EditDocumentTypeDTO;
      const documentType = await documentTypesService.editById(id, data);
      res.json(documentType);
    } catch (err) {
      next(err);
    }
  },

  softDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const documentType = await documentTypesService.softDeleteById(id);
      res.json(documentType);
    } catch (err) {
      next(err);
    }
  },
};
