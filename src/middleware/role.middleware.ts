import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "../db/types.js";

import { roleSchema } from "better-auth/client";

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const parsed = roleSchema.safeParse(req.user.role);
    if (!parsed.success) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!allowedRoles.includes(parsed.data as UserRole)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
};
