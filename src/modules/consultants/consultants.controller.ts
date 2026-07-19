import type { Request, Response, NextFunction } from "express";
import { consultantsService } from "./consultants.service.js";
import type {
  CreateConsultantDTO,
  EditConsultantDTO,
} from "./consultants.types.js";
import { isUniqueViolation } from "../../lib/service-helpers.js";
import createHttpError from "http-errors";
import type { PaginationParams, UuidParam } from "../../lib/validators.js";

export const consultantsController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query as unknown as PaginationParams;
      const { data, total } = await consultantsService.list(page, limit);
      res.json({ data, pagination: { page, limit, total } });
    } catch (error) {
      next(error);
    }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as unknown as CreateConsultantDTO;
      const user = await consultantsService.create(data);
      res.status(201).json(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return next(
          createHttpError(
            409,
            "A consultant with this credentials already exists.",
          ),
        );
      }
      next(error);
    }
  },
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const user = await consultantsService.getById(id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  },
  editById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const { user, consultantProfile } =
        req.body as unknown as EditConsultantDTO;

      const updatedUser = await consultantsService.editById(id, {
        user,
        consultantProfile,
      });

      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  },
  softDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const result = await consultantsService.softDeleteById(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
  hardDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const result = await consultantsService.hardDeleteById(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
  inactivateById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const result = await consultantsService.inactivateById(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
  activateById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const result = await consultantsService.activateById(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
