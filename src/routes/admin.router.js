// ============================================================
// admin.router.js
// ============================================================

import { Router } from "express";
import {
  getAllCustomers,
  getCustomerById,
  deleteCustomer,
} from "../controllers/adminUsers.controller.js";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";

const adminRouter = Router();

// ─── CUSTOMER MANAGEMENT (ADMIN ONLY) ────────────────────────
adminRouter.route("/users").get(protect, isAdmin, getAllCustomers);
adminRouter.route("/users/:userid").get(protect, isAdmin, getCustomerById);
adminRouter.route("/users/:userid").delete(protect, isAdmin, deleteCustomer);

export default adminRouter;
