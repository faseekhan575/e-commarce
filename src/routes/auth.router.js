import { Router } from "express";
import {
  register,
  verifyOTP,
  login,
  googleLogin,
  redirectToGoogle,
  googleOAuthCallback,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  getCurrentUser,
  logout,
} from "../controllers/auth.contollers.js";
import { protect } from "../middlewares/auth.middleware.js";

const authRouter = Router();

authRouter.route("/register").post(register);
authRouter.route("/verify-otp").post(verifyOTP);
authRouter.route("/login").post(login);

// Google Sign-In (Both Popup JSON API & Direct Browser Redirect supported)
authRouter.route("/google").post(googleLogin);
authRouter.route("/google/redirect").get(redirectToGoogle);
authRouter.route("/google/callback").get(googleOAuthCallback);

authRouter.route("/forgot-password").post(forgotPassword);
authRouter.route("/verify-reset-otp").post(verifyResetOTP);
authRouter.route("/reset-password").post(resetPassword);
authRouter.route("/me").get(protect, getCurrentUser);
authRouter.route("/logout").post(protect, logout);

export default authRouter;

