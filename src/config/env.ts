import { z } from "zod";

/**
 * The single source of truth for all environment variables.
 * When you add a new environment variable, add it here as well. Otherwise, type safety will be lost.
 */
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  APP_PORT: z.coerce.number().int().positive().default(3001),

  // DATABASE_URL — Postgres connection string
  DATABASE_URL: z.url(),
  POSTGRES_PASSWORD: z.string().min(12),
  POSTGRES_DB: z.string(),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),

  JWT_REFRESH_SECRET: z.string().min(32),

  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  ALLOWED_ORIGIN: z.url(),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  // Rate limit
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  // Email service
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

// Validate
const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Error: Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

// export type-safe env
export const env = parsed.data;

export type Env = z.infer<typeof EnvSchema>;
