import type { NextFunction, Request, Response } from "express";
import { onboardingService } from "./onboarding.service.js";
import type { CreateOnboardingDto } from "./onboarding.types.js";

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  err.code === "23505";

export const onboardingController = {
  getAll: (_req: Request, res: Response, _next: NextFunction) => {
    res.json({});
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as CreateOnboardingDto;
      const profile = await onboardingService.create(req.user!.id, data);
      res.status(201).json(profile);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return res
          .status(409)
          .json({ error: "An onboarding profile already exists for this user." });
      }
      next(err);
    }
  },
};
