import createHttpError from "http-errors";
import type { User, UserRole } from "../db/types.js";

export function assertUserWithRole(
  user: User | undefined,
  role: UserRole,
): User | void {
  if (!user || user?.role !== role) {
    throw createHttpError(404, "User not found.");
  }
  return user;
}

export const isUniqueViolation = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  err.code === "23505";
