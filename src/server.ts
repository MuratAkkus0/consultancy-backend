import "dotenv/config.js";
import { app } from "./app.js";
import { env } from "./config/env.js";
import http from "node:http";
import { initSocket } from "./lib/socket.js";
import { verifyMailer } from "./lib/email/mailer.js";

const PORT = env.APP_PORT;

const server = http.createServer(app);

initSocket(server);

// Non-fatal SMTP probe: logs whether email is ready, never blocks startup.
void verifyMailer();

server.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});

export { server };
