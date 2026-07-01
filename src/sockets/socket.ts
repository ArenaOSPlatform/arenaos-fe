import { io } from "socket.io-client";
import { getAccessToken } from "@/utils/authStorage";

const socketUrl = (
  import.meta.env.VITE_SOCKET_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  ""
).replace(/\/$/, "");

export const socket = io(socketUrl || undefined, {
  transports: ["websocket"],
  autoConnect: false,
});

export function connectSocket(): boolean {
  const token = getAccessToken();
  const currentToken = (socket.auth as { token?: string }).token;

  if (!token) {
    socket.auth = {};

    if (socket.connected) {
      socket.disconnect();
    }

    return false;
  }

  if (socket.connected && currentToken !== token) {
    socket.disconnect();
  }

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }

  return true;
}
