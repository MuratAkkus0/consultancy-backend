import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool);

console.log("Applying migrations from ./src/db/migrations ...");
await migrate(db, { migrationsFolder: "./src/db/migrations" });
console.log("Done.");

await pool.end();
