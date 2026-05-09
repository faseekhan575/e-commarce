// ============================================================
// order.router.js
// ============================================================
import { Router } from "express";
import {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  downloadOrdersCSV,
} from "../controllers/order.controller.js";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";

const orderRouter = Router();

orderRouter.route("/place").post(protect, placeOrder);
orderRouter.route("/my").get(protect, getMyOrders);
orderRouter.route("/all").get(protect, isAdmin, getAllOrders);
orderRouter.route("/download").get(protect, isAdmin, downloadOrdersCSV);
orderRouter.route("/:orderid/status").patch(protect, isAdmin, updateOrderStatus);

export default orderRouter;