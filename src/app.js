import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CROS_ORIGIN,
    credentials: true,
}))

app.use(express.json({ limit: "20kb" }))
app.use(express.urlencoded({ extended: true, limit: "20kb" }))
app.use(express.static("public"))
app.use(cookieParser())

// ── ROUTERS ──────────────────────────────────────────────────
import authRouter       from "./routes/auth.router.js"
import userRouter       from "./routes/user.router.js"
import productRouter    from "./routes/product.router.js"
import categoryRouter   from "./routes/category.router.js"
import cartRouter       from "./routes/cart.router.js"
import orderRouter      from "./routes/order.router.js"
import reviewRouter     from "./routes/review.router.js"
import superadminRouter from "./routes/superadmin.router.js"
import dashboardRouter  from "./routes/dashboard.router.js"

app.use("/api/v1/auth",       authRouter)
app.use("/api/v2/user",       userRouter)
app.use("/api/v3/product",    productRouter)
app.use("/api/v4/category",   categoryRouter)
app.use("/api/v5/cart",       cartRouter)
app.use("/api/v6/order",      orderRouter)
app.use("/api/v7/review",     reviewRouter)
app.use("/api/v8/superadmin", superadminRouter)
app.use("/api/v9/dashboard",  dashboardRouter)

// ── ERROR HANDLER ────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal server error",
    })
})

export default app