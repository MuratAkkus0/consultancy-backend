import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/db.js";
import { env } from "../config/env.js";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { users } from "../db/index.js";
import { sendMail } from "./email/mailer.js";
import { resetPasswordEmail, verifyEmail } from "./email/templates.js";
import { config } from "../config/config.js";

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
    ...(config.isProd && {
      crossSubDomainCookies: { enabled: true, domain: `.${env.APP_WEB_HOST}` },
    }),
  },
  emailAndPassword: {
    enabled: true,
    // better-auth only calls this for an existing user, then still reports
    // success to the client regardless (so it never leaks whether an email is
    // registered). A mail failure must not break that flow, so we log and
    // swallow instead of letting it bubble into a 500.
    sendResetPassword: async ({ user, url }) => {
      try {
        const mail = resetPasswordEmail({ url, name: user.name });
        await sendMail({ to: user.email, ...mail });
      } catch (err) {
        console.error("[auth] failed to send reset-password email:", err);
      }
    },
  },
  emailVerification: {
    // Fire a verification email automatically after sign-up.
    sendOnSignUp: true,
    // The verify-email route redirects to the dashboard, which is protected;
    // without a session here the user would be bounced back to login.
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // better-auth defaults callbackURL to "/" (the API root). Overwrite it so
      // the redirect after verification always lands on the web app dashboard,
      // whatever the client sent at sign-up.
      const verifyUrl = new URL(url);
      verifyUrl.searchParams.set(
        "callbackURL",
        new URL("/dashboard", env.APP_WEB_URL).toString(),
      );

      try {
        const mail = verifyEmail({
          url: verifyUrl.toString(),
          name: user.name,
        });
        await sendMail({ to: user.email, ...mail });
      } catch (err) {
        console.error("[auth] failed to send verification email:", err);
      }
    },
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
