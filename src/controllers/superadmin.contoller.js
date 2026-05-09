import { User } from "../models/user.models.js";          // ❌ missing .js
import { ApiError } from "../utils/ApiError.js";           // ❌ missing .js
import ApiResponse from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asyncHandler.js";   // ❌ missing .js

// ─── GET ALL USERS ───────────────────────────────────────────
export const getAllUsers = asynchandler(async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip  = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find()
      .select("-password -tokens -otp -otpExpiry")  // ❌ was comma separated
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    User.countDocuments(),
  ]);

  if (!users) {
    throw new ApiError(400, "Issue while fetching users");
  }

  return res.status(200).json(
    new ApiResponse(200, { users, total, page }, "All users fetched successfully")  // ❌ args order was wrong
  );
});

// ─── GET ALL ADMINS ──────────────────────────────────────────
export const getAllAdmins = asynchandler(async (req, res) => {
  const admins = await User.find({ role: "admin" })
    .select("-password -tokens -otp -otpExpiry");  // ❌ was comma separated

  if (!admins) {
    throw new ApiError(400, "Issue while fetching admins");
  }

  return res.status(200).json(
    new ApiResponse(200, admins, "All admins fetched successfully")  // ❌ args order was wrong
  );
});

// ─── PROMOTE USER TO ADMIN ───────────────────────────────────
export const makeUserAdmin = asynchandler(async (req, res) => {
  const { userid } = req.params;

  const getuser = await User.findById(userid);  // ❌ was User.find(userid)

  if (!getuser) {
    throw new ApiError(404, "User not found");
  }

  if (getuser.role === "admin") {               // ❌ was User.role not getuser.role
    throw new ApiError(400, "User is already an admin");
  }

  if (getuser.role === "superadmin") {          // ❌ was User.role not getuser.role
    throw new ApiError(400, "Cannot change superadmin role");
  }

  const updatedUser = await User.findByIdAndUpdate(
    userid,
    { $set: { role: "admin" } },
    { new: true }
  ).select("-password -tokens -otp -otpExpiry");

  if (!updatedUser) {
    throw new ApiError(400, "Failed to promote user, try again");
  }

  return res.status(200).json(
    new ApiResponse(200, updatedUser, "User promoted to admin successfully")
  );
});

// ─── DEMOTE ADMIN TO USER ────────────────────────────────────
export const makeAdminUser = asynchandler(async (req, res) => {
  const { userid } = req.params;

  const getuser = await User.findById(userid);  // ❌ was User.find(userid)

  if (!getuser) {
    throw new ApiError(404, "User not found");
  }

  if (getuser.role === "user") {                // ❌ was checking "admin" instead of "user"
    throw new ApiError(400, "User is already a regular user");
  }

  if (getuser.role === "superadmin") {          // ❌ was User.role not getuser.role
    throw new ApiError(400, "Cannot change superadmin role");
  }

  const updatedUser = await User.findByIdAndUpdate(
    userid,
    { $set: { role: "user" } },
    { new: true }
  ).select("-password -tokens -otp -otpExpiry");

  if (!updatedUser) {
    throw new ApiError(400, "Failed to demote admin, try again");
  }

  return res.status(200).json(
    new ApiResponse(200, updatedUser, "Admin demoted to user successfully")
  );
});

// ─── DELETE USER ─────────────────────────────────────────────
export const deleteUser = asynchandler(async (req, res) => {
  const { userid } = req.params;

  const getuser = await User.findById(userid);

  if (!getuser) {
    throw new ApiError(404, "User not found");
  }

  if (getuser.role === "superadmin") {
    throw new ApiError(400, "Cannot delete superadmin");  // ❌ was missing this check
  }

  await User.findByIdAndDelete(userid);

  return res.status(200).json(
    new ApiResponse(200, {}, "User deleted successfully")  // ❌ message was wrong
  );
});

// ─── GET DASHBOARD STATS ─────────────────────────────────────
export const getDashboardStats = asynchandler(async (req, res) => {
  const { Order }   = await import("../models/order.model.js");
  const { Product } = await import("../models/product.model.js");

  const [
    totalUsers,
    totalAdmins,
    totalProducts,
    totalOrders,
    pendingOrders,
    recentOrders,
    totalRevenueData,
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "admin" }),
    Product.countDocuments({ isActive: true }),
    Order.countDocuments(),
    Order.countDocuments({ status: "pending" }),
    Order.find()
      .populate("user", "fullname email")
      .sort({ createdAt: -1 })
      .limit(5),
    Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);

  const totalRevenue = totalRevenueData[0]?.total || 0;

  return res.status(200).json(
    new ApiResponse(200, {
      totalUsers,
      totalAdmins,
      totalProducts,
      totalOrders,
      pendingOrders,
      recentOrders,
      totalRevenue,
    }, "Dashboard stats fetched successfully")
  );
});