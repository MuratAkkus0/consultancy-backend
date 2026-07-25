import { env } from "./env.js";

export const config = {
  env: env.NODE_ENV,
  isDev: env.NODE_ENV === "development",
  isProd: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",

  server: {
    port: env.APP_PORT,
    cors: {
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
    },
  },

  db: {
    url: env.DATABASE_URL,
    poolMin: 2,
    poolMax: 10,
    idleTimeoutMs: 30_000,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },

  log: {
    level: env.LOG_LEVEL,
  },

  smtp: env.SMTP_HOST
    ? {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT!,
        user: env.SMTP_USER!,
        pass: env.SMTP_PASS!,
      }
    : null,
} as const;
