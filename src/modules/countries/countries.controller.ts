import type { NextFunction, Request, Response } from "express";
import { countriesService } from "./countries.service.js";

export const countriesController = {
  list: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const countries = await countriesService.list();
      res.json(countries);
    } catch (err) {
      next(err);
    }
  },
};
