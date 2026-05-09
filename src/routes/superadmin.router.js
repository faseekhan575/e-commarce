// ============================================================
// superadmin.router.js
// ============================================================
import { Router } from "express";
import {
  getAllUsers,
  getAllAdmins,
  makeUserAdmin,
  makeAdminUser,
  deleteUser,
  getDashboardStats,
} from "../controllers/superadmin.contoller.js";
import { protect, isSuperAdmin } from "../middlewares/auth.middleware.js";

const superadminRouter = Router();

superadminRouter.route("/users").get(protect, isSuperAdmin, getAllUsers);
superadminRouter.route("/admins").get(protect, isSuperAdmin, getAllAdmins);
superadminRouter.route("/promote/:userid").patch(protect, isSuperAdmin, makeUserAdmin);
superadminRouter.route("/demote/:userid").patch(protect, isSuperAdmin, makeAdminUser);
superadminRouter.route("/delete/:userid").delete(protect, isSuperAdmin, deleteUser);
superadminRouter.route("/stats").get(protect, isSuperAdmin, getDashboardStats);

export default superadminRouter;