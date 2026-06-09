import { defineConfig } from "drizzle-kit";
import { env } from "./src/config";

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env!.DATABASE_URL,
  },
  verbose: true,
  strict: true,
  casing: "snake_case",
});
