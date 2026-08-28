// ============================================================
// adminUsers.controller.js
// ============================================================

import mongoose from "mongoose";
import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { Order } from "../models/orders.model.js";
import { Review } from "../models/review.model.js";
import { Cart } from "../models/cart.model.js";
import { deleteImage } from "../utils/cloudinary.js";


// ─── GET ALL CUSTOMERS (ADMIN ONLY) ──────────────────────────
export const getAllCustomers = asynchandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 15);
  const skip = (page - 1) * limit;

  const { search, isVerified } = req.query;

  const query = { role: "user" };

  if (isVerified !== undefined && isVerified !== "") {
    query.isVerified = isVerified === "true";
  }

  if (search) {
    query.$or = [
      { fullname: { $regex: search.trim(), $options: "i" } },
      { email: { $regex: search.trim(), $options: "i" } },
      { username: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select("-password -tokens -otp -otpExpiry")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    User.countDocuments(query),
  ]);

  // Aggregate orders and spend for each customer
  const userIds = users.map((u) => u._id);
  const orderStats = await Order.aggregate([
    { $match: { user: { $in: userIds } } },
    {
      $group: {
        _id: "$user",
        totalOrders: { $sum: 1 },
        totalSpent: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0],
          },
        },
      },
    },
  ]);

  const statsMap = {};
  orderStats.forEach((stat) => {
    statsMap[stat._id.toString()] = {
      totalOrders: stat.totalOrders,
      totalSpent: stat.totalSpent,
    };
  });

  const customersWithStats = users.map((u) => ({
    ...u.toObject(),
    totalOrders: statsMap[u._id.toString()]?.totalOrders || 0,
    totalSpent: statsMap[u._id.toString()]?.totalSpent || 0,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        customers: customersWithStats,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      },
      "Customers fetched successfully"
    )
  );
});

// ─── GET SINGLE CUSTOMER DETAILS (ADMIN ONLY) ────────────────
export const getCustomerById = asynchandler(async (req, res) => {
  const { userid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userid)) {
    throw new ApiError(400, "Invalid user ID format");
  }

  const user = await User.findById(userid).select(
    "-password -tokens -otp -otpExpiry"
  );

  if (!user) {
    throw new ApiError(404, "Customer not found");
  }

  const [orders, reviews, cart] = await Promise.all([
    Order.find({ user: userid })
      .populate("items.product", "title price images")
      .sort({ createdAt: -1 }),
    Review.find({ user: userid })
      .populate("product", "title images")
      .sort({ createdAt: -1 }),
    Cart.findOne({ user: userid }).populate("items.product", "title price images"),
  ]);

  const totalSpent = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user,
        totalOrders: orders.length,
        totalSpent,
        orders,
        reviews,
        cart: cart?.items || [],
      },
      "Customer details fetched successfully"
    )
  );
});

// ─── DELETE CUSTOMER (ADMIN ONLY) ────────────────────────────
export const deleteCustomer = asynchandler(async (req, res) => {
  const { userid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userid)) {
    throw new ApiError(400, "Invalid user ID format");
  }

  const user = await User.findById(userid);
  if (!user) {
    throw new ApiError(404, "Customer not found");
  }

  // Prevent deleting admin accounts
  if (user.role === "admin") {
    throw new ApiError(400, "Cannot delete administrative accounts");
  }

  if (user.avatar?.public_id) {
    await deleteImage(user.avatar.public_id);
  }

  await User.findByIdAndDelete(userid);


  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Customer account deleted successfully"));
});
