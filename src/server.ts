import { app } from "./app.js";
import { env } from "./config/env.js";
import http from "node:http";
import { initSocket } from "./lib/socket.js";
import { verifyMailer } from "./lib/email/mailer.js";
import { logger } from "./lib/logger.js";

// Node would crash on these anyway; logging first puts the cause in the
// journal as JSON next to everything else. systemd restarts the service.
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception");
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "unhandled promise rejection");
  process.exit(1);
});

const PORT = env.APP_PORT;

const server = http.createServer(app);

await initSocket(server);

// Non-fatal SMTP probe: logs whether email is ready, never blocks startup.
void verifyMailer();

server.listen(PORT, () => {
  logger.info({ port: PORT }, "server listening");
});

export { server };
