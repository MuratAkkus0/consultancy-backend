import type { NextFunction, Request, Response } from "express";
import { applicationsService } from "./applications.service.js";
import type { UuidParam } from "../../lib/validators.js";
import type {
  ApplicationQuery,
  ConsultantCreateApplicationDTO,
  ConsultantEditApplicationDTO,
  CreateApplicationDTO,
  EditApplicationDTO,
} from "./applications.types.js";
import type { User } from "../../db/types.js";

export const applicationsController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;

      let application;
      if (user.role === "admin") {
        const data = req.body as unknown as CreateApplicationDTO;
        application = await applicationsService.create(data);
      } else if (user.role === "consultant") {
        const data = req.body as unknown as ConsultantCreateApplicationDTO;
        // The consultant files under their own id, and only for a student
        // assigned to them (enforced in the service).
        application = await applicationsService.createForConsultant(
          user.id,
          data,
        );
      }

      res.status(201).json(application);
    } catch (err) {
      next(err);
    }
  },

  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const params = req.query as unknown as ApplicationQuery;

      let result;
      if (user.role === "admin") {
        result = await applicationsService.list(params);
      } else if (user.role === "consultant") {
        result = await applicationsService.listForConsultant(user.id, params);
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

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const user = req.user as User;

      let application;
      if (user.role === "admin") {
        application = await applicationsService.getById(id);
      } else if (user.role === "consultant") {
        application = await applicationsService.getByIdForConsultant(
          user.id,
          id,
        );
      } else if (user.role === "student") {
        application = await applicationsService.getByIdForStudent(user.id, id);
      }

      res.json(application);
    } catch (err) {
      next(err);
    }
  },

  editById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const user = req.user as User;

      let application;
      if (user.role === "admin") {
        const data = req.body as unknown as EditApplicationDTO;
        application = await applicationsService.editById(id, data);
      } else if (user.role === "consultant") {
        const data = req.body as unknown as ConsultantEditApplicationDTO;
        application = await applicationsService.editByIdForConsultant(
          id,
          user.id,
          data,
        );
      }

      res.json(application);
    } catch (err) {
      next(err);
    }
  },

  softDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const application = await applicationsService.softDeleteById(id);
      res.json(application);
    } catch (err) {
      next(err);
    }
  },

  hardDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const application = await applicationsService.hardDeleteById(id);
      res.json(application);
    } catch (err) {
      next(err);
    }
  },
};
