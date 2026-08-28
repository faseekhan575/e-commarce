// ============================================================
// banner.router.js
// ============================================================

import { Router } from "express";
import {
  getAllActiveBanners,
  getBannersByCollection,
  getBannerById,
  getAdminBanners,
  createBanner,
  updateBanner,
  toggleActiveBanner,
  deleteBanner,
} from "../controllers/banner.controller.js";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const bannerRouter = Router();

// ============================================================
// PUBLIC ROUTES
// ============================================================

// Get active banners for homepage hero slider / carousels
bannerRouter.route("/").get(getAllActiveBanners);

// Get banners for a specific collection (new_arrivals, summer_collection, monthly_drop, etc.)
bannerRouter.route("/collection/:collectionType").get(getBannersByCollection);

// ============================================================
// ADMIN ROUTES (BEFORE /:bannerid to avoid collision)
// ============================================================

// Admin full config list (all banners, active + inactive)
bannerRouter.route("/admin/all").get(protect, isAdmin, getAdminBanners);

// Create new banner
bannerRouter
  .route("/create")
  .post(protect, isAdmin, upload.single("image"), createBanner);

// ============================================================
// PARAM ROUTES
// ============================================================

// Get single banner details & live styling preview
bannerRouter.route("/:bannerid").get(getBannerById);

// Update banner text, styling, overlay, links, or image
bannerRouter
  .route("/:bannerid/update")
  .patch(protect, isAdmin, upload.single("image"), updateBanner);

// 1-Click quick toggle active / inactive status
bannerRouter
  .route("/:bannerid/toggle-active")
  .patch(protect, isAdmin, toggleActiveBanner);

// Delete banner & clean Cloudinary assets
bannerRouter
  .route("/:bannerid/delete")
  .delete(protect, isAdmin, deleteBanner);

export default bannerRouter;
