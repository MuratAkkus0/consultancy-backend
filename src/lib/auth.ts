import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/db.js";
import { env } from "../config/env.js";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { users } from "../db/index.js";

export const auth = betterAuth({
  experimental: { joins: true },
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.ALLOWED_ORIGINS,
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  logger: {
    level: "debug",
  },
  advanced: {
    database: { generateId: () => randomUUID() },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    // google: {},
  },
  user: {
    additionalFields: {
      firstName: { type: "string", required: true, input: true },
      lastName: { type: "string", required: true, input: true },
      birthDate: { type: "date", required: false, input: true },
      gender: { type: "string", required: false, input: true },
      role: {
        type: "string",
        required: false,
        input: false,
        defaultValue: "student",
      },
      phone: { type: "string", required: false, input: true },
      preferredLanguage: {
        type: "string",
        required: false,
        input: true,
        defaultValue: "tr",
      },
      timezone: { type: "string", required: false, input: true },
      status: {
        type: "string",
        required: false,
        input: false,
        defaultValue: "active",
      },
    },
  },
  onAPIError: {
    throw: true,
    onError: (error) => {
      // Custom error handling
      console.error("Auth error:", error);
    },
    errorURL: "/auth/error",
    customizeDefaultErrorPage: {
      colors: {
        background: "#ffffff",
        foreground: "#000000",
        primary: "#0070f3",
        primaryForeground: "#ffffff",
        mutedForeground: "#666666",
        border: "#e0e0e0",
        destructive: "#ef4444",
        titleBorder: "#0070f3",
        titleColor: "#000000",
        gridColor: "#f0f0f0",
        cardBackground: "#ffffff",
        cornerBorder: "#0070f3",
      },
      size: {
        radiusSm: "0.25rem",
        radiusMd: "0.5rem",
        radiusLg: "1rem",
        textSm: "0.875rem",
        text2xl: "1.5rem",
        text4xl: "2.25rem",
        text6xl: "3.75rem",
      },
      font: {
        defaultFamily: "system-ui, sans-serif",
        monoFamily: "monospace",
      },
      disableTitleBorder: false,
      disableCornerDecorations: false,
      disableBackgroundGrid: false,
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            columns: { status: true },
          });
          if (user?.status !== "active") {
            throw new APIError("FORBIDDEN", {
              message: "Account is not active.",
            });
          }
        },
      },
    },
  },
});
