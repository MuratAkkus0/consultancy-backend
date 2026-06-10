import type {
  userGenderEnum,
  userRoleEnum,
  userStatusEnum,
} from "./schema/auth.js";
import type { languageLevel } from "./schema/student_languages.js";
import type { educationLevelEnum } from "./schema/student_profiles.js";
import type { consentTypeEnum } from "./schema/user_consents.js";

// Language
export type LanguageLevel = (typeof languageLevel.enumValues)[number];

// User
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type UserStatus = (typeof userStatusEnum.enumValues)[number];
export type UserGender = (typeof userGenderEnum.enumValues)[number];

// Consent
export type ConsentType = (typeof consentTypeEnum.enumValues)[number];

// Student
export type EducationLevel = (typeof educationLevelEnum.enumValues)[number];
