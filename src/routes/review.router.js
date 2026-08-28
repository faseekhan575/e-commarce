// ============================================================
// review.router.js
// ============================================================

import { Router } from "express";
import {
  getProductReviews,
  getAllReviews,
  addReview,
  deleteReview,
} from "../controllers/review.controller.js";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const reviewRouter = Router();

// ============================================================
// ADMIN ROUTES (BEFORE :productid)
// ============================================================

// Moderate all reviews across store
reviewRouter.route("/admin/all").get(protect, isAdmin, getAllReviews);

// ============================================================
// PUBLIC & USER ROUTES
// ============================================================

// Get product reviews
reviewRouter.route("/:productid").get(getProductReviews);

// Add review (verified customer)
reviewRouter
  .route("/:productid/add")
  .post(protect, upload.array("images", 3), addReview);

// Delete review (user own review / admin any review)
reviewRouter.route("/:reviewid/delete").delete(protect, deleteReview);

export default reviewRouter;