import dotenv from "dotenv"
import connect from "./db/index.js"
import app from "./app.js"
import { createServer } from "http"
import { Server } from "socket.io"

dotenv.config({ path: './.env' })

const httpServer = createServer(app)

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CROS_ORIGIN,
    credentials: true,
  }
})

io.on("connection", (socket) => {
  socket.on("join_admin_room", () => {
    socket.join("admin_room")
  })
})

connect().then(() => {
  httpServer.listen(process.env.PORT || 4000, () => {
    console.log(`Server is running on port ${process.env.PORT}`)
  })
}).catch((err) => {
  console.log(err)
  process.exit(1)
})