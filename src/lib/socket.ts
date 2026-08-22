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
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

let io: AppSocketServer | undefined;

let redisPubClient: ReturnType<typeof createClient> | undefined;
let redisSubClient: ReturnType<typeof createClient> | undefined;

export const initSocket = async (server: HttpServer) => {
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

  redisPubClient = createClient({
    url: env.AWS_REDIS_URL,
  });

  redisSubClient = redisPubClient.duplicate();

  redisPubClient.on("error", (error) => {
    console.error("[redis:pub]", error);
  });

  redisSubClient.on("error", (error) => {
    console.error("[redis:sub]", error);
  });

  await Promise.all([redisPubClient.connect(), redisSubClient.connect()]);

  io.adapter(createAdapter(redisPubClient, redisSubClient));

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
