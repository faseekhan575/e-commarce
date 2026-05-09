// ============================================================
// dashboard.router.js
// ============================================================
import { Router } from "express";
import {
  getDashboardStats,
  getLiveOrders,
  getMonthlyOrders,
  getOrderDetail,
} from "../controllers/dashboardstats.contoller.js";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";

const dashboardRouter = Router();

dashboardRouter.route("/stats").get(protect, isAdmin, getDashboardStats);
dashboardRouter.route("/live-orders").get(protect, isAdmin, getLiveOrders);
dashboardRouter.route("/monthly-orders").get(protect, isAdmin, getMonthlyOrders);
dashboardRouter.route("/order/:orderid").get(protect, isAdmin, getOrderDetail);

export default dashboardRouter;