// ============================================================
// auth.router.js
// ============================================================
import { Router } from "express";
import {
  register,
  verifyOTP,
  login,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  logout,
} from "../controllers/auth.contollers.js"
import { protect } from "../middlewares/auth.middleware.js";

const authRouter = Router();

authRouter.route("/register").post(register);
authRouter.route("/verify-otp").post(verifyOTP);
authRouter.route("/login").post(login);
authRouter.route("/forgot-password").post(forgotPassword);
authRouter.route("/verify-reset-otp").post(verifyResetOTP);
authRouter.route("/reset-password").post(resetPassword);
authRouter.route("/logout").post(protect, logout);

export default authRouter;