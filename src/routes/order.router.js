import { Router } from "express";
import {
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
  getAllOrders,
  updateOrderStatus,
  updateOrderTracking,
  downloadOrdersCSV,
} from "../controllers/order.controller.js";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";

const orderRouter = Router();

// ===========================================================
// USER / CUSTOMER ROUTES
// ===========================================================

// Place order
orderRouter.route("/place").post(protect, placeOrder);

// Get logged-in user order history
orderRouter.route("/my").get(protect, getMyOrders);

// Cancel my pending order (restores product stock)
orderRouter.route("/:orderid/cancel").patch(protect, cancelMyOrder);

// ===========================================================
// ADMIN ROUTES (BEFORE generic :orderid)
// ===========================================================

// Get all orders (with search, status, and payment filters)
orderRouter.route("/all").get(protect, isAdmin, getAllOrders);

// Download CSV report
orderRouter.route("/download").get(protect, isAdmin, downloadOrdersCSV);

// ===========================================================
// PARAM ROUTES
// ===========================================================

// Get single order detail (user sees own, admin sees any)
orderRouter.route("/:orderid").get(protect, getOrderById);

// Update order status & payment status (admin)
orderRouter
  .route("/:orderid/status")
  .patch(protect, isAdmin, updateOrderStatus);

// Update courier tracking & dispatch details (admin)
orderRouter
  .route("/:orderid/tracking")
  .patch(protect, isAdmin, updateOrderTracking);

export default orderRouter;
