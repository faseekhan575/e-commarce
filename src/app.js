import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { corsOptions } from "./utils/corsConfig.js";

const app = express();

app.use(cors(corsOptions));


app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// ── ROUTERS ──────────────────────────────────────────────────
import authRouter from "./routes/auth.router.js";
import userRouter from "./routes/user.router.js";
import productRouter from "./routes/product.router.js";
import categoryRouter from "./routes/category.router.js";
import cartRouter from "./routes/cart.router.js";
import orderRouter from "./routes/order.router.js";
import reviewRouter from "./routes/review.router.js";
import adminRouter from "./routes/admin.router.js";
import dashboardRouter from "./routes/dashboard.router.js";
import bannerRouter from "./routes/banner.router.js";

app.use("/api/v1/auth", authRouter);
app.use("/api/v2/user", userRouter);
app.use("/api/v3/product", productRouter);
app.use("/api/v4/category", categoryRouter);
app.use("/api/v5/cart", cartRouter);
app.use("/api/v6/order", orderRouter);
app.use("/api/v7/review", reviewRouter);
app.use("/api/v8/admin", adminRouter);
app.use("/api/v8/superadmin", adminRouter); // backward-compatible alias
app.use("/api/v9/dashboard", dashboardRouter);
app.use("/api/v10/banner", bannerRouter);
app.use("/api/v10/banners", bannerRouter); // plural alias


// ── HEALTH CHECK ROUTE ─────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "E-Commerce API is healthy" });
});

// ── 404 NOT FOUND HANDLER ──────────────────────────────────────
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ── GLOBAL ERROR HANDLER ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  const statusCode = err.statusCode || err.statuscode || 500;
  res.status(statusCode).json({
    success: false,
    statusCode,
    message: err.message || "Internal server error",
    errors: err.errors || [],
  });
});

export default app;