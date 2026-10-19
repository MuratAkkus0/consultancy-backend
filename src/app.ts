import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import { auth } from "./lib/auth.js";
import { toNodeHandler } from "better-auth/node";
import { env } from "./config/env.js";
import swaggerUI from "swagger-ui-express";
import onboardingRoutes from "./modules/onboarding/onboarding.routes.js";
import studentsRoutes from "./modules/students/students.routes.js";
import consultantsRoutes from "./modules/consultants/consultants.routes.js";
import assignmentsRoutes from "./modules/assignments/assignments.routes.js";
import coursesRoutes from "./modules/courses/courses.routes.js";
import messagesRoutes from "./modules/messages/messages.routes.js";
import conversationsRoutes from "./modules/conversations/conversations.routes.js";
import paymentsRoutes from "./modules/payments/payments.routes.js";
import invoicesRoutes from "./modules/invoices/invoices.routes.js";
import applicationsRoutes from "./modules/applications/applications.routes.js";
import appointmentsRoutes from "./modules/appointments/appointments.routes.js";
import documentsRoutes from "./modules/documents/documents.routes.js";
import documentTypesRoutes from "./modules/document_types/document_types.routes.js";
import languagesRoutes from "./modules/languages/languages.routes.js";
import countriesRoutes from "./modules/countries/countries.routes.js";
import requiredDocumentsRoutes from "./modules/required_documents/required_documents.routes.js";
import meRoutes from "./modules/me/me.routes.js";
import createHttpError from "http-errors";
import { z } from "zod";
import { buildOpenApiDocument } from "./swagger.js";
import { registerRoute } from "./lib/openapi.js";
import { apiLimiter, authLimiter } from "./middleware/rate-limit.middleware.js";
import { requestLogger } from "./middleware/request-logger.middleware.js";

const app = express();

app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
    // Lets the web app read the id and show it in its error UI.
    exposedHeaders: ["X-Request-Id"],
  }),
);

app.set("trust proxy", env.TRUSTED_PROXY_HOPS);

// After cors, so answered preflights stay out of the log.
app.use(requestLogger);

const authHandler = toNodeHandler(auth);
app.use("/api/auth/sign-in", authLimiter);
app.use("/api/auth/sign-up", authLimiter);
app.use("/api/auth/request-password-reset", authLimiter);

app.post("/api/auth/update-user", (_req, _res) => {
  throw createHttpError(404);
});

app.all("/api/auth/*splat", async (req, res, next) => {
  try {
    await authHandler(req, res);
  } catch (err) {
    next(err);
  }
});

// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json({ limit: "100kb" }));

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

registerRoute({
  method: "post",
  path: "/api/auth/sign-out",
  tags: ["Auth"],
  summary: "Sign out (clears the session cookie)",
  responses: {
    200: { description: "Signed out; session cookie cleared" },
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

app.use("/api/v1", apiLimiter);

app.use("/api/v1/onboarding", onboardingRoutes);
app.use("/api/v1/students", studentsRoutes);
app.use("/api/v1/consultants", consultantsRoutes);
app.use("/api/v1/assignments", assignmentsRoutes);
app.use("/api/v1/courses", coursesRoutes);
app.use("/api/v1/conversations/:conversationId/messages", messagesRoutes);
app.use("/api/v1/conversations", conversationsRoutes);
app.use("/api/v1/payments", paymentsRoutes);
app.use("/api/v1/invoices", invoicesRoutes);
app.use("/api/v1/applications", applicationsRoutes);
app.use("/api/v1/appointments", appointmentsRoutes);
app.use("/api/v1/documents", documentsRoutes);
app.use("/api/v1/document-types", documentTypesRoutes);
app.use("/api/v1/languages", languagesRoutes);
app.use("/api/v1/countries", countriesRoutes);
app.use("/api/v1/required-documents", requiredDocumentsRoutes);
app.use("/api/v1/me", meRoutes);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error Handler
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const status = createHttpError.isHttpError(err) ? err.status : 500;

  if (status >= 500) {
    // pino-http writes this, stack included, on the request's completion line.
    res.err = err instanceof Error ? err : new Error(String(err));
  }

  if (res.headersSent) return;

  if (createHttpError.isHttpError(err) && err.expose) {
    const issues: unknown = err.issues;
    return res.status(status).json({
      error: err.message,
      ...(issues ? { issues } : {}),
    });
  }

  // The id is what a user can report back to find this exact failure in the log.
  res.status(status).json({ error: "Internal server error", requestId: req.id });
});

export { app };
