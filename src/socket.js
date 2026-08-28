import { Server } from "socket.io";
import { corsOriginDelegate } from "./utils/corsConfig.js";

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: corsOriginDelegate,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("join_admin_room", () => {
      socket.join("admin_room");
    });
  });

  return io;
};


export const getIO = () => {
  return io;
};

export { io };
