import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userSession = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!userSession) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  req.user = userSession.user;
  req.session = userSession.session;

  next();
};
