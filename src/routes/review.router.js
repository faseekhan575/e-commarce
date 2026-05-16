// ============================================================
// review.router.js
// ============================================================

import { Router } from "express";

import {
  getProductReviews,
  addReview,
  deleteReview,
} from "../controllers/review.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

import { upload } from "../middlewares/multer.middleware.js";

const reviewRouter = Router();

// ============================================================
// GET PRODUCT REVIEWS
// ============================================================

reviewRouter
  .route("/:productid")
  .get(getProductReviews);

// ============================================================
// ADD REVIEW
// ============================================================

reviewRouter
  .route("/:productid/add")
  .post(
    protect,
    upload.array("images", 3),
    addReview
  );

// ============================================================
// DELETE REVIEW
// ============================================================

reviewRouter
  .route("/:reviewid/delete")
  .delete(
    protect,
    deleteReview
  );

export default reviewRouter;