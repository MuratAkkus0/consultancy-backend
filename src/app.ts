import express from "express";
import cors from "cors";
import { auth } from "./lib/auth.js";
import { toNodeHandler } from "better-auth/node";
import { fromNodeHeaders } from "better-auth/node";
import { env } from "./config/env.js";
import onboardingRoutes from "./modules/onboarding/onboarding.routes.js";
import studentsRoutes from "./modules/students/students.routes.js";
const app = express();

app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

const authHandler = toNodeHandler(auth);
app.all("/api/auth/*splat", async (req, res, next) => {
  console.log(`[AUTH-IN]  ${req.method} ${req.url}`);
  try {
    await authHandler(req, res);
    console.log(`[AUTH-OUT] ${req.method} ${req.url} -> ${res.statusCode}`);
  } catch (err) {
    console.error(`[AUTH-ERR] ${req.method} ${req.url}`);
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
    next(err);
  }
});

// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json({ limit: "100kb" }));

app.get("/api/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return res.json(session);
});

app.get("/health", (_req, res) => {
  res.send("ok").status(200);
});

app.get("/", (_req, res) => {
  res.send("Hello World!");
});

app.use("/api/v1/onboarding", onboardingRoutes);
app.use("/api/v1/students", studentsRoutes);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("[EXPRESS-ERR]", err);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: err instanceof Error ? err.message : String(err) });
    }
  },
);

export { app };
