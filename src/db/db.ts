// src/lib/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index.js";
import { config } from "../config/index.js";
import fs from "fs";
import { logger } from "../lib/logger.js";

const log = logger.child({ module: "db" });

const pool = new Pool({
  connectionString: config.db.url,
  min: config.db.poolMin,
  max: config.db.poolMax,
  idleTimeoutMillis: config.db.idleTimeoutMs,
  connectionTimeoutMillis: 5_000,

  application_name: "campus69-backend",

  // TLS follows the CA bundle, not NODE_ENV: a production database reached
  // over loopback has nothing to encrypt.
  ssl: config.db.sslCa
    ? {
        rejectUnauthorized: true,
        ca: fs.readFileSync(config.db.sslCa, "utf8"),
      }
    : false,
});

// Connection error
pool.on("error", (err) => {
  log.error({ err }, "unexpected error on idle pg client");
});

export const db = drizzle(pool, {
  schema,
  casing: "snake_case",
  // Dev only: query params hold user data and password hashes.
  logger: config.isDev && {
    logQuery: (query, params) => log.debug({ params }, query),
  },
});

export type Database = typeof db;

// Graceful shutdown
export async function closeDb(): Promise<void> {
  await pool.end();
}
