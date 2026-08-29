// ============================================================
// spotlight.router.js
// ============================================================

import { Router } from "express";
import {
  getPublicSpotlight,
  getAdminSpotlights,
  getSpotlightById,
  createSpotlight,
  updateSpotlight,
  toggleSpotlightActive,
  deleteSpotlight,
  getHomepageData,
} from "../controllers/spotlight.controller.js";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const spotlightRouter = Router();

// ============================================================
// PUBLIC ROUTES
// ============================================================

// Get active editorial lookbook spotlights
spotlightRouter.route("/").get(getPublicSpotlight);

// Get complete unified homepage payload (Banners + Categories + Fabrics + Top Selling + Editorial Spotlight)
spotlightRouter.route("/homepage").get(getHomepageData);

// ============================================================
// ADMIN ROUTES (BEFORE /:spotlightid)
// ============================================================

// Admin full spotlight list
spotlightRouter.route("/admin/all").get(protect, isAdmin, getAdminSpotlights);

// Create spotlight (with Lookbook image upload)
spotlightRouter
  .route("/create")
  .post(protect, isAdmin, upload.single("image"), createSpotlight);

// ============================================================
// PARAM ROUTES
// ============================================================

// Get single spotlight details
spotlightRouter.route("/:spotlightid").get(getSpotlightById);

// Update spotlight (can upload new image)
spotlightRouter
  .route("/:spotlightid/update")
  .patch(protect, isAdmin, upload.single("image"), updateSpotlight);

// Toggle active status (1-Click)
spotlightRouter
  .route("/:spotlightid/toggle-active")
  .patch(protect, isAdmin, toggleSpotlightActive);

// Delete spotlight
spotlightRouter
  .route("/:spotlightid/delete")
  .delete(protect, isAdmin, deleteSpotlight);

export default spotlightRouter;
