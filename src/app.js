import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app=express()

app.use(cors({
    origin:process.env.CROS_ORIGIN,
    credentials:true,
}))

app.use(express.json({limit:"20kb"}))
app.use(express.urlencoded({extended:true,limit:"20kb"}))
app.use(express.static("public"))
app.use(cookieParser())


import authrouter from "./routes/auth.router.js"

app.use("/api/v1/user",authrouter)

export default app