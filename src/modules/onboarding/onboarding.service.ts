import createHttpError from "http-errors";
import { db, studentProfilesTable } from "../../db/index.js";
import type { CreateOnboardingDto } from "./onboarding.types.js";
import { isUniqueViolation } from "../../lib/service-helpers.js";

export const onboardingService = {
  create: async (userId: string, data: CreateOnboardingDto) => {
    const { gpa, ...rest } = data;

    try {
      const [profile] = await db
        .insert(studentProfilesTable)
        .values({
          ...rest,
          userId,
          gpa: gpa === undefined ? undefined : String(gpa),
        })
        .returning();

      return profile;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw createHttpError(409, "Onboarding already completed.");
      }
      throw err;
    }
  },
};
