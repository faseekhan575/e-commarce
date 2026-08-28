// ============================================================
// dashboard.router.js
// ============================================================

import { Router } from "express";
import {
  getDashboardStats,
  getLiveOrders,
  getMonthlyOrders,
  getOrderDetail,
  getInventorySummary,
} from "../controllers/dashboardstats.contoller.js";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";

const dashboardRouter = Router();

// Executive dashboard stats & revenue analysis
dashboardRouter.route("/stats").get(protect, isAdmin, getDashboardStats);

// Real-time live orders feed (pending + processing)
dashboardRouter.route("/live-orders").get(protect, isAdmin, getLiveOrders);

// Monthly orders & revenue reports
dashboardRouter
  .route("/monthly-orders")
  .get(protect, isAdmin, getMonthlyOrders);

// Inventory overview & stock summary
dashboardRouter
  .route("/inventory-summary")
  .get(protect, isAdmin, getInventorySummary);

// Single order detail view for Admin
dashboardRouter
  .route("/order/:orderid")
  .get(protect, isAdmin, getOrderDetail);

export default dashboardRouter;