import { Router } from "express";
import {
  requireAuth,
  requireRole,
  validateBody,
} from "../../middleware/index.js";
import { onboardingController } from "./onboarding.controller.js";
import { createOnboardingSchema } from "./onboarding.validators.js";
import { registerRoute } from "../../lib/openapi.js";

const router = Router();

const STUDENT_ERRORS = {
  401: { description: "Not authenticated" },
  403: { description: "Student role required" },
} as const;

registerRoute({
  method: "get",
  path: "/api/v1/onboarding",
  tags: ["Onboarding"],
  summary: "Get the current student's onboarding data",
  responses: { 200: { description: "Onboarding data" }, ...STUDENT_ERRORS },
});
router.get(
  "/",
  requireAuth,
  requireRole("student"),
  onboardingController.getAll,
);

registerRoute({
  method: "post",
  path: "/api/v1/onboarding",
  tags: ["Onboarding"],
  summary: "Submit onboarding data",
  request: { body: createOnboardingSchema },
  responses: {
    201: { description: "Onboarding created" },
    400: { description: "Validation error" },
    ...STUDENT_ERRORS,
  },
});
router.post(
  "/",
  requireAuth,
  requireRole("student"),
  validateBody(createOnboardingSchema),
  onboardingController.create,
);

export default router;
