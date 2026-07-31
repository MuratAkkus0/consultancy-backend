import type { NextFunction, Request, Response } from "express";
import { languagesService } from "./languages.service.js";

export const languagesController = {
  list: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const languages = await languagesService.list();
      res.json(languages);
    } catch (err) {
      next(err);
    }
  },
};
