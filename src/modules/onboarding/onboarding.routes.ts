import { Router } from "express";
import {
  requireAuth,
  requireRole,
  validateBody,
} from "../../middleware/index.js";
import { onboardingController } from "./onboarding.controller.js";
import { createOnboardingSchema } from "./onboarding.validators.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireRole("student"),
  onboardingController.getAll,
);

router.post(
  "/",
  requireAuth,
  requireRole("student"),
  validateBody(createOnboardingSchema),
  onboardingController.create,
);

export default router;
