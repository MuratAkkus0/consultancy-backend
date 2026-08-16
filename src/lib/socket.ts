import { Server } from "socket.io";
import { env } from "../config/env.js";
import { socketRequireAuth } from "../middleware/socket-auth.middleware.js";
import type { Server as HttpServer } from "node:http";
import type {
  AppSocketServer,
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types/socket.js";
import { registerConversationsSocket } from "../modules/conversations/conversations.socket.js";

let io: AppSocketServer | undefined;

export const initSocket = (server: HttpServer) => {
  io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {
    cors: {
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    void socketRequireAuth(socket, next);
  });

  io.on("connection", async (socket) => {
    await socket.join(`user:${socket.data.user.id}`);
    registerConversationsSocket(socket);
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket is undefined.");
  }

  return io;
};
