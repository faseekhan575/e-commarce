import { getIO } from "../socket.js";
// ============================================================
// review.controller.js
// ============================================================

import mongoose from "mongoose";
import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Review } from "../models/review.model.js";
import { Order } from "../models/orders.model.js";
import {
  uploadMultipleImages,
  deleteMultipleImages,
} from "../utils/cloudinary.js";

// ============================================================
// GET ALL REVIEWS FOR A PRODUCT (PUBLIC)
// ============================================================
export const getProductReviews = asynchandler(async (req, res) => {
  const { productid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  const reviews = await Review.find({ product: productid })
    .populate("user", "fullname avatar username")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(200, reviews, "Product reviews fetched successfully")
    );
});

// ============================================================
// GET ALL REVIEWS ACROSS STORE (ADMIN ONLY - MODERATION)
// ============================================================
export const getAllReviews = asynchandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 15);
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find()
      .populate("user", "fullname email username avatar")
      .populate("product", "title images price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        reviews,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      },
      "All reviews fetched successfully"
    )
  );
});

// ============================================================
// ADD REVIEW (CUSTOMER - verified purchase check)
// ============================================================
export const addReview = asynchandler(async (req, res) => {
  const { productid } = req.params;
  const { rating, comment } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  if (!rating || !comment) {
    throw new ApiError(400, "Rating (1-5) and comment are required");
  }

  const numRating = Number(rating);
  if (numRating < 1 || numRating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  // Check if customer has purchased and received this product
  const hasPurchased = await Order.findOne({
    user: req.user._id,
    "items.product": productid,
    status: "delivered",
  });

  if (!hasPurchased) {
    throw new ApiError(
      403,
      "You can only review products that have been delivered to you"
    );
  }

  // Check if already reviewed
  const existing = await Review.findOne({
    user: req.user._id,
    product: productid,
  });

  if (existing) {
    throw new ApiError(409, "You have already reviewed this product");
  }

  // Upload review images if any
  let images = [];
  if (req.files && req.files.length > 0) {
    images = await uploadMultipleImages(req.files, {
      folder: "clothing_store/reviews",
    });
  }

  const review = await Review.create({
    user: req.user._id,
    product: productid,
    rating: numRating,
    comment: comment.trim(),
    images,
  });

  const populated = await Review.findById(review._id).populate(
    "user",
    "fullname avatar username"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, populated, "Review submitted successfully"));
});

// ============================================================
// DELETE REVIEW (User deletes own, Admin can delete any)
// ============================================================
export const deleteReview = asynchandler(async (req, res) => {
  const { reviewid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reviewid)) {
    throw new ApiError(400, "Invalid review ID format");
  }

  const review = await Review.findById(reviewid);
  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  // User can only delete own review unless admin
  if (
    review.user.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    throw new ApiError(403, "You do not have permission to delete this review");
  }

  // Delete review images from Cloudinary
  if (review.images && review.images.length > 0) {
    await deleteMultipleImages(review.images.map((img) => img.public_id));
  }

  await Review.findByIdAndDelete(reviewid);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Review deleted successfully"));
});