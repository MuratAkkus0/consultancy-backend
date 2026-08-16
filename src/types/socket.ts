import type { Server, Socket } from "socket.io";
import type { auth } from "../lib/auth.js";

interface MessagePayload {
  conversationId: string;
  id: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  senderId: string;
  readAt: Date | null;
}

export interface ClientToServerEvents {
  "conversation:join": (
    conversationId: string,
    ack: (res: { ok: boolean; error?: string }) => void,
  ) => void;
  "conversation:leave": (
    conversationId: string,
    ack: (res: { ok: boolean; error?: string }) => void,
  ) => void;
}
export interface ServerToClientEvents {
  "message:new": (message: MessagePayload) => void;
  "message:edit": (message: MessagePayload) => void;
  "message:delete": (message: MessagePayload) => void;
}
export interface InterServerEvents {}
export interface SocketData {
  user: typeof auth.$Infer.Session.user;
}

export type AppSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
