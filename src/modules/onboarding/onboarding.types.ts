import type z from "zod";
import type { createOnboardingSchema } from "./onboarding.validators.js";

export type CreateOnboardingDto = z.infer<typeof createOnboardingSchema>;
