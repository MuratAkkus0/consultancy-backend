import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import createHttpError from "http-errors";

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const userSession = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!userSession) {
    throw createHttpError(401, "Unauthorized.");
  }
  req.user = userSession.user;
  req.session = userSession.session;

  next();
};
