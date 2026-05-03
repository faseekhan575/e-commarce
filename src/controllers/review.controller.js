// ============================================================
// review.controller.js
// ============================================================

import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Review } from "../models/review.model.js";
import { Order } from "../models/order.model.js";
import uploadImage from "../utils/cloudinary.js";
import cloudinary from "../utils/cloudinary.js";

// GET ALL REVIEWS FOR A PRODUCT (public)
export const getProductReviews = asynchandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId })
    .populate("user", "fullname avatar username")
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, reviews, "Reviews fetched successfully"));
});

// ADD REVIEW (user — only if purchased)
export const addReview = asynchandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;

  if (!rating || !comment) throw new ApiError(400, "Rating and comment are required");

  // check if user actually purchased this product
  const hasPurchased = await Order.findOne({
    user:           req.user._id,
    "items.product": productId,
    status:         "delivered",
  });

  if (!hasPurchased) throw new ApiError(403, "You can only review products you have purchased and received");

  // check if already reviewed
  const existing = await Review.findOne({ user: req.user._id, product: productId });
  if (existing) throw new ApiError(409, "You have already reviewed this product");

  // upload review images if any
  let images = [];
  if (req.files && req.files.length > 0) {
    const uploads = await Promise.all(req.files.map((f) => uploadImage(f.buffer)));
    images = uploads.map((u) => ({ url: u.secure_url, public_id: u.public_id }));
  }

  const review = await Review.create({
    user:    req.user._id,
    product: productId,
    rating,
    comment,
    images,
  });

  res.status(201).json(new ApiResponse(201, review, "Review added successfully"));
});

// DELETE REVIEW (user deletes own, admin deletes any)
export const deleteReview = asynchandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, "Review not found");

  // user can only delete their own review
  if (
    review.user.toString() !== req.user._id.toString() &&
    req.user.role === "user"
  ) {
    throw new ApiError(403, "You can only delete your own review");
  }

  // delete review images from cloudinary
  if (review.images?.length > 0) {
    await Promise.all(review.images.map((img) => cloudinary.uploader.destroy(img.public_id)));
  }

  await Review.findByIdAndDelete(req.params.id);
  res.status(200).json(new ApiResponse(200, {}, "Review deleted successfully"));
});