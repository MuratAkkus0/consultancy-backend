import { eq } from "drizzle-orm";
import { auth } from "../src/lib/auth.js";
import { db, closeDb, users } from "../src/db/index.js";

// better-auth's emailAndPassword default minimum password length.
const MIN_PASSWORD_LENGTH = 8;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

const email = requireEnv("SEED_ADMIN_EMAIL");
const password = requireEnv("SEED_ADMIN_PASSWORD");

if (password.length < MIN_PASSWORD_LENGTH) {
  throw new Error(
    `SEED_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`,
  );
}

const existing = await db.query.users.findFirst({
  where: eq(users.email, email),
  columns: { id: true, role: true },
});

if (existing) {
  if (existing.role === "admin") {
    console.log(`Admin already exists: ${email}. Nothing to do.`);
  } else {
    await db.update(users).set({ role: "admin" }).where(eq(users.id, existing.id));
    console.log(`Promoted existing user to admin: ${email}`);
  }
} else {
  await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: "Admin",
      firstName: "Admin",
      lastName: "User",
    },
  });
  await db.update(users).set({ role: "admin" }).where(eq(users.email, email));
  console.log(`Created admin user: ${email}`);
}

await closeDb();
