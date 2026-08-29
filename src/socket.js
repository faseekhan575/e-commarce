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
    // Admin joins the real-time store dashboard room
    socket.on("join_admin_room", () => {
      socket.join("admin_room");
      console.log(`📡 Socket [${socket.id}] joined admin_room`);
    });

    // Customer joins their personal room for live tracking
    socket.on("join_user_room", (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`📡 Socket [${socket.id}] joined user room: user_${userId}`);
      }
    });

    socket.on("disconnect", () => {
      // Clean disconnect
    });
  });

  return io;
};



export const getIO = () => {
  return io;
};

export { io };
