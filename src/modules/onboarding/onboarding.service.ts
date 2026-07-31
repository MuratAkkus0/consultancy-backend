import createHttpError from "http-errors";
import {
  db,
  studentLanguagesTable,
  studentProfilesTable,
  studentTargetCountriesTable,
} from "../../db/index.js";
import type { CreateOnboardingDto } from "./onboarding.types.js";
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from "../../lib/service-helpers.js";

export const onboardingService = {
  create: async (userId: string, data: CreateOnboardingDto) => {
    const { gpa, languages, targetCountries, ...rest } = data;

    try {
      return await db.transaction(async (tx) => {
        const [profile] = await tx
          .insert(studentProfilesTable)
          .values({
            ...rest,
            userId,
            gpa: gpa === undefined ? undefined : String(gpa),
          })
          .returning();

        if (!profile) {
          throw createHttpError(500, "Could not create onboarding profile.");
        }

        if (languages.length) {
          await tx.insert(studentLanguagesTable).values(
            languages.map((language) => ({
              studenProfileId: profile.id,
              languageId: language.languageId,
              level: language.level,
              certificates: language.certificates,
            })),
          );
        }

        if (targetCountries.length) {
          await tx.insert(studentTargetCountriesTable).values(
            targetCountries.map((country) => ({
              studentProfileId: profile.id,
              countryId: country.countryId,
              priority: country.priority,
              notes: country.notes,
            })),
          );
        }

        return profile;
      });
    } catch (err) {
      // A bad languageId/countryId fails the FK before any unique check.
      if (isForeignKeyViolation(err)) {
        throw createHttpError(422, "Invalid language or country.");
      }
      if (isUniqueViolation(err)) {
        throw createHttpError(409, "Onboarding already completed.");
      }
      throw err;
    }
  },
};
