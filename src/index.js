import dotenv from "dotenv";
import connect from "./db/index.js";
import app from "./app.js";
import { createServer } from "http";
import { initSocket } from "./socket.js";

dotenv.config({ path: "./.env" });

const httpServer = createServer(app);

// Initialize Socket.io
export const io = initSocket(httpServer);

const PORT = process.env.PORT || 4000;

connect()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });