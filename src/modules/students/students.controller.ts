import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { studentsService } from "./students.service.js";
import type { PaginationParams, UuidParam } from "../../lib/validators.js";
import type { User } from "../../db/types.js";

export const studentsController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query as unknown as PaginationParams;
      const { data, total } = await studentsService.list(page, limit);
      res.json({ data, pagination: { page, limit, total } });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const user = req.user as User;

      let student;
      if (user.role === "admin") {
        student = await studentsService.getById(id);
      } else if (user.role === "consultant") {
        student = await studentsService.getByIdForConsultant(user.id, id);
      }

      if (!student) {
        throw createHttpError(404, "Student not found.");
      }
      res.json(student);
    } catch (err) {
      next(err);
    }
  },
};
