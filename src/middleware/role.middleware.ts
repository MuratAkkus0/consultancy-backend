import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "../db/types.js";
import createHttpError from "http-errors";

import { roleSchema } from "../lib/validators.js";

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw createHttpError(401, "Unauthorized.");
    }

    const parsed = roleSchema.safeParse(req.user.role);
    if (!parsed.success) {
      throw createHttpError(403, "Forbidden");
    }

    if (!allowedRoles.includes(parsed.data)) {
      throw createHttpError(403, "Forbidden");
    }
    next();
  };
};
