import { db, studentProfilesTable } from "../../db/index.js";
import type { CreateOnboardingDto } from "./onboarding.types.js";

export const onboardingService = {
  create: async (userId: string, data: CreateOnboardingDto) => {
    const { gpa, ...rest } = data;

    const [profile] = await db
      .insert(studentProfilesTable)
      .values({
        ...rest,
        userId,
        gpa: gpa === undefined ? undefined : String(gpa),
      })
      .returning();

    return profile;
  },
};
