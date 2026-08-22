// src/lib/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index.js";
import { config } from "../config/index.js";
import fs from "fs";

const pool = new Pool({
  connectionString: config.db.url,
  min: config.db.poolMin,
  max: config.db.poolMax,
  idleTimeoutMillis: config.db.idleTimeoutMs,
  connectionTimeoutMillis: 5_000,

  application_name: "milestonegermany-backend",

  ssl: config.isProd
    ? {
        rejectUnauthorized: true,
        ca: fs.readFileSync("/etc/ssl/rds/global-bundle.pem", "utf8"),
      }
    : false,
});

// Connection error
pool.on("error", (err) => {
  console.error("Unexpected error on idle pg client", err);
});

export const db = drizzle(pool, {
  schema,
  casing: "snake_case",
  logger: config.isDev,
});

export type Database = typeof db;

// Graceful shutdown
export async function closeDb(): Promise<void> {
  await pool.end();
}
