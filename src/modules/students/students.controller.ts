import type { NextFunction, Request, Response } from "express";
import { studentsService } from "./students.service.js";
import type { PaginationParams, UuidParam } from "./students.types.js";

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
      const profile = await studentsService.getById(id);
      if (!profile) {
        return res.status(404).json({ error: "Student profile not found." });
      }
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },
};
