import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { appointmentsService } from "./appointments.service.js";
import { isUniqueViolation } from "../../lib/service-helpers.js";
import type { UuidParam } from "../../lib/validators.js";
import type {
  AppointmentQuery,
  ConsultantCreateAppointmentDTO,
  ConsultantEditAppointmentDTO,
  CreateAppointmentDTO,
  EditAppointmentDTO,
} from "./appointments.types.js";
import type { User } from "../../db/types.js";

export const appointmentsController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;

      let appointment;
      if (user.role === "admin") {
        const data = req.body as unknown as CreateAppointmentDTO;
        appointment = await appointmentsService.create(data);
      } else if (user.role === "consultant") {
        const data = req.body as unknown as ConsultantCreateAppointmentDTO;
        // The consultant schedules under their own id, and only with a student
        // assigned to them (enforced in the service).
        appointment = await appointmentsService.createForConsultant(
          user.id,
          data,
        );
      }

      res.status(201).json(appointment);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return next(
          createHttpError(
            409,
            "Consultant already has an appointment in this time range.",
          ),
        );
      }
      next(err);
    }
  },

  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const params = req.query as unknown as AppointmentQuery;

      let result;
      if (user.role === "admin") {
        result = await appointmentsService.list(params);
      } else if (user.role === "consultant") {
        result = await appointmentsService.listForConsultant(user.id, params);
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

      let appointment;
      if (user.role === "admin") {
        appointment = await appointmentsService.getById(id);
      } else if (user.role === "consultant") {
        appointment = await appointmentsService.getByIdForConsultant(
          user.id,
          id,
        );
      }

      res.json(appointment);
    } catch (err) {
      next(err);
    }
  },

  editById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const user = req.user as User;

      let appointment;
      if (user.role === "admin") {
        const data = req.body as unknown as EditAppointmentDTO;
        appointment = await appointmentsService.editById(id, data);
      } else if (user.role === "consultant") {
        const data = req.body as unknown as ConsultantEditAppointmentDTO;
        appointment = await appointmentsService.editByIdForConsultant(
          id,
          user.id,
          data,
        );
      }

      res.json(appointment);
    } catch (err) {
      // Editing scheduledAt can also collide with an existing slot.
      if (isUniqueViolation(err)) {
        return next(
          createHttpError(
            409,
            "Consultant already has an appointment in this time range.",
          ),
        );
      }
      next(err);
    }
  },

  softDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const appointment = await appointmentsService.softDeleteById(id);
      res.json(appointment);
    } catch (err) {
      next(err);
    }
  },

  hardDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const appointment = await appointmentsService.hardDeleteById(id);
      res.json(appointment);
    } catch (err) {
      next(err);
    }
  },
};
