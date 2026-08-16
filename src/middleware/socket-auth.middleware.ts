import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import type { AppSocket } from "../types/socket.js";

export const socketRequireAuth = async (
  socket: AppSocket,
  next: (err?: Error) => void,
) => {
  try {
    const userSession = await auth.api.getSession({
      headers: fromNodeHeaders(socket.handshake.headers),
    });

    if (!userSession) {
      return next(new Error("Unauthorized."));
    }

    if (userSession.user.status !== "active") {
      return next(new Error("Account is not active."));
    }

    socket.data.user = userSession.user;

    next();
  } catch (error) {
    return next(
      error instanceof Error ? error : new Error("Authentication failed."),
    );
  }
};
