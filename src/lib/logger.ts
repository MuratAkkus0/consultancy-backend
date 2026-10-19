import { pino } from "pino";
import { config } from "../config/config.js";

export const logger = pino({
  level: config.isTest ? "silent" : config.log.level,
  // journald already records the pid and hostname of every line.
  base: null,
  timestamp: pino.stdTimeFunctions.isoTime,
  // Defence in depth: request serializers never emit headers or bodies, but an
  // object passed to a log call by hand still must not leak credentials.
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "headers.authorization",
      "headers.cookie",
      '*.headers["set-cookie"]',
    ],
    censor: "[redacted]",
  },
  // pino-pretty is a devDependency: production installs with --omit=dev and
  // writes plain JSON for journald and jq.
  ...(config.isDev && {
    transport: {
      target: "pino-pretty",
      options: { translateTime: "SYS:HH:MM:ss.l" },
    },
  }),
});
