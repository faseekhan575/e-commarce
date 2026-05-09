// ============================================================
// cart.router.js
// ============================================================
import { Router } from "express";
import {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
  updateQuantity,
} from "../controllers/cart.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const cartRouter = Router();

cartRouter.route("/").get(protect, getCart);
cartRouter.route("/add").post(protect, addToCart);
cartRouter.route("/quantity").patch(protect, updateQuantity);
cartRouter.route("/remove").delete(protect, removeFromCart);
cartRouter.route("/clear").delete(protect, clearCart);

export default cartRouter;