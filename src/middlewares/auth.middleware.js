import { asynchandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";

// ─── PROTECT ────────────────────────────────────────────────
export const protect = asynchandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Not authorized, no token");
  }

  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SCERET);

  const user = await User.findById(decoded._id).select("-password -tokens -otp -otpExpiry");

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  req.user = user;
  next();
});

// ─── RESTRICT TO ROLES ──────────────────────────────────────
// usage: restrictTo("admin", "superadmin")
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, `Access denied. Only ${roles.join(", ")} can do this`);
    }
    next();
  };
};

// ─── IS ADMIN ───────────────────────────────────────────────
// shorthand middleware for admin + superadmin routes
export const isAdmin = restrictTo("admin", "superadmin");

// ─── IS SUPER ADMIN ─────────────────────────────────────────
// shorthand middleware for superadmin only routes
export const isSuperAdmin = restrictTo("superadmin");