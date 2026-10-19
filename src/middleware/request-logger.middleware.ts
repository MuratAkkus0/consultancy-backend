import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { pinoHttp } from "pino-http";
import { logger } from "../lib/logger.js";

// A caller-supplied id lets the frontend correlate its own logs, but it lands
// verbatim in ours, so only a short, plain token is accepted.
const REQUEST_ID_PATTERN = /^[\w-]{1,64}$/;

// Email links carry one-time tokens in the path and query; a log line must not
// be enough to reset a password or verify an account.
const sanitizeUrl = (url: string): string => {
  if (!url.startsWith("/api/auth/")) return url;
  return url
    .replace(/\?.*$/, "")
    .replace(/^(\/api\/auth\/reset-password\/).+/, "$1[redacted]");
};

// Express rewrites req.url inside routers; originalUrl is the full path.
const fullUrl = (req: IncomingMessage): string =>
  sanitizeUrl(
    ("originalUrl" in req && typeof req.originalUrl === "string"
      ? req.originalUrl
      : req.url) ?? "",
  );

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers["x-request-id"];
    const id =
      typeof incoming === "string" && REQUEST_ID_PATTERN.test(incoming)
        ? incoming
        : randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  // Lines logged through req.log carry only the reqId; the full request is
  // written once, on the completion line.
  quietReqLogger: true,
  autoLogging: {
    ignore: (req) =>
      req.url === "/health" || (req.url ?? "").startsWith("/swagger-ui"),
  },
  serializers: {
    req: (req: { method: string; raw: IncomingMessage }) => ({
      method: req.method,
      url: fullUrl(req.raw),
    }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) =>
    `${req.method} ${fullUrl(req)} ${res.statusCode}`,
  customErrorMessage: (req, res) =>
    `${req.method} ${fullUrl(req)} ${res.statusCode}`,
});
