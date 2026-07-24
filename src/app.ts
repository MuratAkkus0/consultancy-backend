import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import { auth } from "./lib/auth.js";
import { toNodeHandler } from "better-auth/node";
import { fromNodeHeaders } from "better-auth/node";
import { env } from "./config/env.js";
import swaggerUI from "swagger-ui-express";
import onboardingRoutes from "./modules/onboarding/onboarding.routes.js";
import studentsRoutes from "./modules/students/students.routes.js";
import consultantsRoutes from "./modules/consultants/consultants.routes.js";
import assignmentsRoutes from "./modules/assignments/assignments.routes.js";
import coursesRoutes from "./modules/courses/courses.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import createHttpError from "http-errors";
import { z } from "zod";
import { buildOpenApiDocument } from "./swagger.js";
import { registerRoute } from "./lib/openapi.js";

const app = express();

app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

const authHandler = toNodeHandler(auth);
app.post("/api/auth/update-user", (_req, res) => {
  res.status(404);
});

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

// Better Auth endpoints are served by the catch-all handler above, so they
// have no route module to self-register from. Document sign-in here directly.
// A successful sign-in sets the session cookie, which same-origin "Try it out"
// calls from this Swagger UI then send automatically — no manual Authorize step.
const signInEmailSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
  callbackURL: z.string().optional(),
});
registerRoute({
  method: "post",
  path: "/api/auth/sign-in/email",
  tags: ["Auth"],
  summary: "Sign in with email & password",
  isPublic: true,
  request: { body: signInEmailSchema },
  responses: {
    200: { description: "Signed in; sets the session cookie" },
    401: { description: "Invalid email or password" },
  },
});

// Swagger UI
app.use(
  "/swagger-ui",
  swaggerUI.serve,
  swaggerUI.setup(buildOpenApiDocument()),
);

app.get("/health", (_req, res) => {
  res.send("ok").status(200);
});

app.get("/", (_req, res) => {
  res.send("Hello World!");
});

app.use("/api/v1/onboarding", onboardingRoutes);
app.use("/api/v1/students", studentsRoutes);
app.use("/api/v1/consultants", consultantsRoutes);
app.use("/api/v1/assignments", assignmentsRoutes);
app.use("/api/v1/courses", coursesRoutes);
app.use("/api/v1/admin", adminRoutes);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error Handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (createHttpError.isHttpError(err)) {
    const issues: unknown = err.issues;
    return res.status(err.status).json({
      error: err.expose ? err.message : "Internal server error",
      ...(err.expose && issues ? { issues } : {}),
    });
  }

  console.error("[EXPRESS-ERR]", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export { app };
