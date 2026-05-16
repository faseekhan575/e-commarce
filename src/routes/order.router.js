// ===========================================================
// order.router.js
// ===========================================================

import { Router } from "express";

import {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  downloadOrdersCSV,
} from "../controllers/order.controller.js";

import {
  protect,
  isAdmin,
} from "../middlewares/auth.middleware.js";

const orderRouter = Router();

// ===========================================================
// USER ROUTES
// ===========================================================

// Place order
orderRouter.route("/place").post(
  protect,
  placeOrder
);

// Get logged-in user orders
orderRouter.route("/my").get(
  protect,
  getMyOrders
);

// ===========================================================
// ADMIN ROUTES
// ===========================================================

// Get all orders
orderRouter.route("/all").get(
  protect,
  isAdmin,
  getAllOrders
);

// Download CSV
orderRouter.route("/download").get(
  protect,
  isAdmin,
  downloadOrdersCSV
);

// Update order status
// IMPORTANT:
// KEEPING :orderid BECAUSE FRONTEND ALREADY USES IT
orderRouter.route("/:orderid/status").patch(
  protect,
  isAdmin,
  updateOrderStatus
);

export default orderRouter;