import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { onboardingService } from "./onboarding.service.js";
import type { CreateOnboardingDto } from "./onboarding.types.js";
import { isUniqueViolation } from "../../lib/service-helpers.js";

export const onboardingController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as CreateOnboardingDto;
      const profile = await onboardingService.create(req.user!.id, data);
      res.status(201).json(profile);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return next(
          createHttpError(
            409,
            "An onboarding profile already exists for this user.",
          ),
        );
      }
      next(err);
    }
  },
};
