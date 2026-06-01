import { io } from "socket.io-client";

const socketUrl = (
  import.meta.env.VITE_SOCKET_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  ""
).replace(/\/$/, "");

export const socket = io(socketUrl || undefined, {
  transports: ["websocket"],
  autoConnect: false,
});
