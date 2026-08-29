import { getIO } from "../socket.js";
// ============================================================
// banner.controller.js - Luxury Fashion Banner & Store Config
// ============================================================

import mongoose from "mongoose";
import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Banner } from "../models/banner.model.js";
import { uploadBannerImage, deleteImage } from "../utils/cloudinary.js";

// ============================================================
// GET ALL ACTIVE BANNERS (PUBLIC - Hero Slider & Home Carousels)
// ============================================================
export const getAllActiveBanners = asynchandler(async (req, res) => {
  const { collectionType } = req.query;

  const query = { isActive: true };
  if (collectionType) {
    query.collectionType = collectionType;
  }

  const banners = await Banner.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .populate("createdBy", "fullname");

  return res.status(200).json(
    new ApiResponse(200, banners, "Active banners fetched successfully")
  );
});

// ============================================================
// GET BANNERS BY COLLECTION TYPE (PUBLIC - New Arrivals, Summer, etc.)
// ============================================================
export const getBannersByCollection = asynchandler(async (req, res) => {
  const { collectionType } = req.params;

  const banners = await Banner.find({
    collectionType,
    isActive: true,
  }).sort({ priority: -1, createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      banners,
      `Banners for collection '${collectionType}' fetched successfully`
    )
  );
});

// ============================================================
// GET SINGLE BANNER (PUBLIC / ADMIN)
// ============================================================
export const getBannerById = asynchandler(async (req, res) => {
  const { bannerid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(bannerid)) {
    throw new ApiError(400, "Invalid banner ID format");
  }

  const banner = await Banner.findById(bannerid).populate(
    "createdBy",
    "fullname email"
  );

  if (!banner) {
    throw new ApiError(404, "Banner not found");
  }

  return res.status(200).json(
    new ApiResponse(200, banner, "Banner fetched successfully")
  );
});

// ============================================================
// GET ALL BANNERS FOR ADMIN (ADMIN ONLY - Full Config Panel)
// ============================================================
export const getAdminBanners = asynchandler(async (req, res) => {
  const { collectionType, isActive } = req.query;

  const query = {};
  if (collectionType) query.collectionType = collectionType;
  if (isActive !== undefined && isActive !== "") {
    query.isActive = isActive === "true" || isActive === true;
  }

  const [banners, totalBanners, activeCount, inactiveCount] = await Promise.all([
    Banner.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .populate("createdBy", "fullname email"),
    Banner.countDocuments(query),
    Banner.countDocuments({ isActive: true }),
    Banner.countDocuments({ isActive: false }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        banners,
        totalBanners,
        activeCount,
        inactiveCount,
      },
      "Admin banners fetched successfully"
    )
  );
});

// ============================================================
// CREATE BANNER (ADMIN ONLY)
// ============================================================
export const createBanner = asynchandler(async (req, res) => {
  const {
    title,
    subtitle,
    badge,
    collectionType,
    ctaText,
    ctaLink,
    textPosition,
    textColor,
    overlayOpacity,
    theme,
    priority,
    isActive,
  } = req.body;

  const bannerTitle = (title && title.trim()) || "Luxury Campaign";

  let image = {
    url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=80",
    public_id: "",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&q=80",
    bannerOptimizedUrl:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=80",
  };

  if (req.file) {
    const uploaded = await uploadBannerImage(req.file.buffer, {
      folder: "clothing_store/banners",
    });
    if (uploaded) {
      image = {
        url: uploaded.secure_url,
        public_id: uploaded.public_id,
        thumbnailUrl: uploaded.thumbnailUrl || uploaded.secure_url,
        bannerOptimizedUrl: uploaded.bannerOptimizedUrl || uploaded.secure_url,
      };
    }
  } else if (req.body.imageUrl && req.body.imageUrl.trim()) {
    const url = req.body.imageUrl.trim();
    image = {
      url,
      public_id: "",
      thumbnailUrl: url,
      bannerOptimizedUrl: url,
    };
  }

  const banner = await Banner.create({
    title: bannerTitle,
    subtitle: subtitle ? subtitle.trim() : "",
    badge: badge ? badge.trim().toUpperCase() : "NEW ARRIVALS",
    collectionType: collectionType || "featured_hero",
    image,
    cta: {
      text: ctaText ? ctaText.trim() : "Shop Now",
      link: ctaLink ? ctaLink.trim() : "/products",
    },

    styling: {
      textPosition: textPosition || "left",
      textColor: textColor || "#FFFFFF",
      overlayOpacity:
        overlayOpacity !== undefined ? Math.min(1, Math.max(0, Number(overlayOpacity))) : 0.4,
      theme: theme || "dark",
    },
    priority: priority !== undefined ? Number(priority) : 0,
    isActive: isActive !== undefined ? isActive === "true" || isActive === true : true,
    createdBy: req.user._id,
  });

  return res.status(201).json(
    new ApiResponse(201, banner, "Luxury banner created successfully")
  );
});

// ============================================================
// UPDATE BANNER (ADMIN ONLY)
// ============================================================
export const updateBanner = asynchandler(async (req, res) => {
  const { bannerid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(bannerid)) {
    throw new ApiError(400, "Invalid banner ID format");
  }

  const banner = await Banner.findById(bannerid);
  if (!banner) {
    throw new ApiError(404, "Banner not found");
  }

  const {
    title,
    subtitle,
    badge,
    collectionType,
    ctaText,
    ctaLink,
    textPosition,
    textColor,
    overlayOpacity,
    theme,
    priority,
    isActive,
  } = req.body;

  if (title !== undefined) banner.title = title.trim();
  if (subtitle !== undefined) banner.subtitle = subtitle.trim();
  if (badge !== undefined) banner.badge = badge.trim().toUpperCase();
  if (collectionType !== undefined) banner.collectionType = collectionType;
  if (priority !== undefined) banner.priority = Number(priority);
  if (isActive !== undefined) {
    banner.isActive = isActive === "true" || isActive === true;
  }

  if (ctaText !== undefined) banner.cta.text = ctaText.trim();
  if (ctaLink !== undefined) banner.cta.link = ctaLink.trim();

  if (textPosition !== undefined) banner.styling.textPosition = textPosition;
  if (textColor !== undefined) banner.styling.textColor = textColor;
  if (overlayOpacity !== undefined) {
    banner.styling.overlayOpacity = Math.min(1, Math.max(0, Number(overlayOpacity)));
  }
  if (theme !== undefined) banner.styling.theme = theme;

  // Replace image if new file uploaded
  if (req.file) {
    if (banner.image?.public_id) {
      await deleteImage(banner.image.public_id);
    }

    const uploaded = await uploadBannerImage(req.file.buffer, {
      folder: "clothing_store/banners",
    });

    if (uploaded) {
      banner.image = {
        url: uploaded.secure_url,
        public_id: uploaded.public_id,
        thumbnailUrl: uploaded.thumbnailUrl || uploaded.secure_url,
        bannerOptimizedUrl: uploaded.bannerOptimizedUrl || uploaded.secure_url,
      };
    }
  }

  await banner.save();

  return res.status(200).json(
    new ApiResponse(200, banner, "Banner updated successfully")
  );
});

// ============================================================
// TOGGLE BANNER ACTIVE STATUS (ADMIN ONLY - 1 Click)
// ============================================================
export const toggleActiveBanner = asynchandler(async (req, res) => {
  const { bannerid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(bannerid)) {
    throw new ApiError(400, "Invalid banner ID format");
  }

  const banner = await Banner.findById(bannerid);
  if (!banner) {
    throw new ApiError(404, "Banner not found");
  }

  banner.isActive = !banner.isActive;
  await banner.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { _id: banner._id, title: banner.title, isActive: banner.isActive },
      `Banner is now ${banner.isActive ? "ACTIVE" : "INACTIVE"}`
    )
  );
});

// ============================================================
// DELETE BANNER (ADMIN ONLY - Cleans Cloudinary)
// ============================================================
export const deleteBanner = asynchandler(async (req, res) => {
  const { bannerid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(bannerid)) {
    throw new ApiError(400, "Invalid banner ID format");
  }

  const banner = await Banner.findById(bannerid);
  if (!banner) {
    throw new ApiError(404, "Banner not found");
  }

  if (banner.image?.public_id) {
    await deleteImage(banner.image.public_id);
  }

  await Banner.findByIdAndDelete(bannerid);

  return res.status(200).json(
    new ApiResponse(200, {}, "Banner deleted successfully")
  );
});
