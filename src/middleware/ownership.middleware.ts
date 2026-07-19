import type { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";

export const requireSelfOrAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const isSelf = req.params.id === req.user?.id;
  const isAdmin = req.user?.role === "admin";

  if (!isSelf && !isAdmin) {
    throw createHttpError(403, "Forbidden.");
  }

  next();
};
