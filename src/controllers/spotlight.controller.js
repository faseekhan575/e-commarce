// ============================================================
// spotlight.controller.js
// ============================================================

import mongoose from "mongoose";
import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Spotlight } from "../models/spotlight.model.js";
import { Banner } from "../models/banner.model.js";
import { Category } from "../models/Category.model.js";
import { Product } from "../models/product.model.js";
import uploadImage, { deleteImage } from "../utils/cloudinary.js";

// Helper to safely parse objects
const parseJSON = (input, fallback = {}) => {
  if (!input) return fallback;
  if (typeof input === "object") return input;
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

// ============================================================
// GET PUBLIC SPOTLIGHT / LOOKBOOK (PUBLIC)
// ============================================================
export const getPublicSpotlight = asynchandler(async (req, res) => {
  const { sectionTag } = req.query;
  const query = { isActive: true };
  if (sectionTag) query.sectionTag = sectionTag;

  const spotlights = await Spotlight.find(query)
    .populate({
      path: "linkedProduct",
      select:
        "title price discountPrice images stock sizes sizeVariants fabric fabricType customBadge dispatchBadge",
    })
    .sort({ priority: -1, createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        spotlights,
        "Active editorial spotlights fetched successfully"
      )
    );
});

// ============================================================
// GET ALL SPOTLIGHTS FOR ADMIN (ADMIN ONLY)
// ============================================================
export const getAdminSpotlights = asynchandler(async (req, res) => {
  const { search, isActive } = req.query;
  const query = {};

  if (isActive !== undefined && isActive !== "") {
    query.isActive = isActive === "true";
  }

  if (search) {
    query.$or = [
      { title: { $regex: search.trim(), $options: "i" } },
      { eyebrow: { $regex: search.trim(), $options: "i" } },
      { description: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const spotlights = await Spotlight.find(query)
    .populate("linkedProduct", "title price discountPrice stock images")
    .populate("createdBy", "fullname email")
    .sort({ priority: -1, createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        spotlights,
        "Admin spotlights fetched successfully"
      )
    );
});

// ============================================================
// GET SINGLE SPOTLIGHT BY ID (PUBLIC / ADMIN)
// ============================================================
export const getSpotlightById = asynchandler(async (req, res) => {
  const { spotlightid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(spotlightid)) {
    throw new ApiError(400, "Invalid spotlight ID format");
  }

  const spotlight = await Spotlight.findById(spotlightid).populate(
    "linkedProduct",
    "title price discountPrice stock images sizes"
  );

  if (!spotlight) {
    throw new ApiError(404, "Spotlight not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, spotlight, "Spotlight detail fetched successfully")
    );
});

// ============================================================
// CREATE SPOTLIGHT (ADMIN ONLY)
// ============================================================
export const createSpotlight = asynchandler(async (req, res) => {
  const {
    eyebrow,
    title,
    description,
    price,
    originalPrice,
    currency,
    dispatchBadge,
    hotspotText,
    hotspotPosX,
    hotspotPosY,
    primaryCtaText,
    primaryCtaLink,
    secondaryCtaText,
    secondaryCtaLink,
    linkedProduct,
    sectionTag,
    isActive,
    priority,
  } = req.body;

  let image = {
    url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80",
    public_id: "",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=400&q=80",
  };

  if (req.file) {
    const uploaded = await uploadImage(req.file.buffer, {
      folder: "clothing_store/spotlight",
    });
    if (uploaded) {
      image = {
        url: uploaded.secure_url,
        public_id: uploaded.public_id,
        thumbnailUrl: uploaded.thumbnailUrl || uploaded.secure_url,
      };
    }
  } else if (req.body.imageUrl && req.body.imageUrl.trim()) {
    image = {
      url: req.body.imageUrl.trim(),
      public_id: "",
      thumbnailUrl: req.body.imageUrl.trim(),
    };
  }


  const hotspot = {
    text: hotspotText ? hotspotText.trim() : "✨ Shop The Model's Kurta",
    posX: hotspotPosX !== undefined ? Number(hotspotPosX) : 35,
    posY: hotspotPosY !== undefined ? Number(hotspotPosY) : 42,
  };

  const primaryCta = {
    text: primaryCtaText
      ? primaryCtaText.trim()
      : "SHOP THIS COMPLETE OUTFIT",
    link: primaryCtaLink ? primaryCtaLink.trim() : "/products",
  };

  const secondaryCta = {
    text: secondaryCtaText
      ? secondaryCtaText.trim()
      : "VIEW FULL LOOKBOOK",
    link: secondaryCtaLink
      ? secondaryCtaLink.trim()
      : "/lookbook/festive-2026",
  };

  let validLinkedProduct = null;
  if (linkedProduct && mongoose.Types.ObjectId.isValid(linkedProduct)) {
    const p = await Product.findById(linkedProduct);
    if (p) validLinkedProduct = p._id;
  }

  const spotlight = await Spotlight.create({
    eyebrow: eyebrow ? eyebrow.trim() : "FESTIVE EDITORIAL 2026",
    title: title.trim(),
    description: description
      ? description.trim()
      : "Crafted from pure 80-gram raw silk with intricate antique kora-dabka neckline hand embroidery, paired with a laser-cut organza dupatta with scalloped borders.",
    price: Number(price),
    originalPrice: originalPrice ? Number(originalPrice) : null,
    currency: currency ? currency.trim() : "PKR",
    dispatchBadge: dispatchBadge
      ? dispatchBadge.trim()
      : "✓ Ready to Dispatch in 24h",
    hotspot,
    image,
    primaryCta,
    secondaryCta,
    linkedProduct: validLinkedProduct,
    sectionTag: sectionTag ? sectionTag.trim() : "festive_spotlight",
    isActive:
      isActive !== undefined ? isActive === "true" || isActive === true : true,
    priority: priority !== undefined ? Number(priority) : 0,
    createdBy: req.user._id,
  });

  const populated = await Spotlight.findById(spotlight._id).populate(
    "linkedProduct",
    "title price discountPrice stock images"
  );

  return res
    .status(201)
    .json(
      new ApiResponse(201, populated, "Editorial spotlight created successfully")
    );
});

// ============================================================
// UPDATE SPOTLIGHT (ADMIN ONLY)
// ============================================================
export const updateSpotlight = asynchandler(async (req, res) => {
  const { spotlightid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(spotlightid)) {
    throw new ApiError(400, "Invalid spotlight ID format");
  }

  const spotlight = await Spotlight.findById(spotlightid);
  if (!spotlight) {
    throw new ApiError(404, "Spotlight not found");
  }

  const {
    eyebrow,
    title,
    description,
    price,
    originalPrice,
    currency,
    dispatchBadge,
    hotspotText,
    hotspotPosX,
    hotspotPosY,
    primaryCtaText,
    primaryCtaLink,
    secondaryCtaText,
    secondaryCtaLink,
    linkedProduct,
    sectionTag,
    isActive,
    priority,
  } = req.body;

  if (eyebrow !== undefined) spotlight.eyebrow = eyebrow.trim();
  if (title !== undefined) spotlight.title = title.trim();
  if (description !== undefined) spotlight.description = description.trim();
  if (price !== undefined) spotlight.price = Number(price);
  if (originalPrice !== undefined) {
    spotlight.originalPrice = originalPrice ? Number(originalPrice) : null;
  }
  if (currency !== undefined) spotlight.currency = currency.trim();
  if (dispatchBadge !== undefined) spotlight.dispatchBadge = dispatchBadge.trim();

  if (hotspotText !== undefined) spotlight.hotspot.text = hotspotText.trim();
  if (hotspotPosX !== undefined) spotlight.hotspot.posX = Number(hotspotPosX);
  if (hotspotPosY !== undefined) spotlight.hotspot.posY = Number(hotspotPosY);

  if (primaryCtaText !== undefined) spotlight.primaryCta.text = primaryCtaText.trim();
  if (primaryCtaLink !== undefined) spotlight.primaryCta.link = primaryCtaLink.trim();

  if (secondaryCtaText !== undefined) {
    spotlight.secondaryCta.text = secondaryCtaText.trim();
  }
  if (secondaryCtaLink !== undefined) {
    spotlight.secondaryCta.link = secondaryCtaLink.trim();
  }

  if (linkedProduct !== undefined) {
    if (linkedProduct && mongoose.Types.ObjectId.isValid(linkedProduct)) {
      spotlight.linkedProduct = linkedProduct;
    } else {
      spotlight.linkedProduct = null;
    }
  }

  if (sectionTag !== undefined) spotlight.sectionTag = sectionTag.trim();
  if (isActive !== undefined) {
    spotlight.isActive = isActive === "true" || isActive === true;
  }
  if (priority !== undefined) spotlight.priority = Number(priority);

  // If new image is uploaded
  if (req.file) {
    if (spotlight.image?.public_id) {
      await deleteImage(spotlight.image.public_id);
    }
    const uploaded = await uploadImage(req.file.buffer, {
      folder: "clothing_store/spotlight",
    });
    if (uploaded) {
      spotlight.image = {
        url: uploaded.secure_url,
        public_id: uploaded.public_id,
        thumbnailUrl: uploaded.thumbnailUrl || uploaded.secure_url,
      };
    }
  }

  await spotlight.save();

  const updated = await Spotlight.findById(spotlight._id).populate(
    "linkedProduct",
    "title price discountPrice stock images"
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updated, "Editorial spotlight updated successfully")
    );
});

// ============================================================
// TOGGLE ACTIVE SPOTLIGHT (ADMIN ONLY)
// ============================================================
export const toggleSpotlightActive = asynchandler(async (req, res) => {
  const { spotlightid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(spotlightid)) {
    throw new ApiError(400, "Invalid spotlight ID format");
  }

  const spotlight = await Spotlight.findById(spotlightid);
  if (!spotlight) throw new ApiError(404, "Spotlight not found");

  spotlight.isActive = !spotlight.isActive;
  await spotlight.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { spotlightId: spotlight._id, isActive: spotlight.isActive },
      `Spotlight marked as ${spotlight.isActive ? "active" : "inactive"}`
    )
  );
});

// ============================================================
// DELETE SPOTLIGHT (ADMIN ONLY)
// ============================================================
export const deleteSpotlight = asynchandler(async (req, res) => {
  const { spotlightid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(spotlightid)) {
    throw new ApiError(400, "Invalid spotlight ID format");
  }

  const spotlight = await Spotlight.findById(spotlightid);
  if (!spotlight) throw new ApiError(404, "Spotlight not found");

  if (spotlight.image?.public_id) {
    await deleteImage(spotlight.image.public_id);
  }

  await spotlight.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Spotlight deleted successfully"));
});

// ============================================================
// UNIFIED HOMEPAGE AGGREGATION ENDPOINT (PUBLIC)
// Returns all visual sections in 1 high-speed call
// ============================================================
export const getHomepageData = asynchandler(async (req, res) => {
  const [banners, categories, topProducts, fabrics, spotlight] =
    await Promise.all([
      // 1. Hero Banners
      Banner.find({ isActive: true }).sort({ priority: -1, createdAt: -1 }),

      // 2. Curated Wardrobe Categories with live product counts
      Category.aggregate([
        {
          $lookup: {
            from: "products",
            let: { catId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$category", "$$catId"] }, isActive: true } },
            ],
            as: "products",
          },
        },
        {
          $project: {
            name: 1,
            slug: 1,
            subtitle: 1,
            eyebrow: 1,
            description: 1,
            image: 1,
            bannerImage: 1,
            isHot: 1,
            isFeatured: 1,
            productCount: { $size: "$products" },
          },
        },
        { $sort: { isHot: -1, isFeatured: -1, productCount: -1 } },
      ]),

      // 3. Top Selling Apparel
      Product.find({ isActive: true })
        .populate("category", "name slug subtitle")
        .sort({ "analytics.purchased": -1, isHot: -1, createdAt: -1 })
        .limit(8),

      // 4. Fabric filter keys
      Product.distinct("fabricType", { isActive: true }),

      // 5. Editorial Spotlight Banner
      Spotlight.findOne({ isActive: true })
        .populate({
          path: "linkedProduct",
          select:
            "title price discountPrice images stock sizes sizeVariants fabric customBadge dispatchBadge",
        })
        .sort({ priority: -1, createdAt: -1 }),
    ]);

  const standardFabrics = [
    "ALL FABRICS",
    "CAMBRIC",
    "LUXURY LAWN",
    "RAW SILK",
    "PURE CHIFFON",
    "WOVEN JACQUARD",
    "LINEN & COTTON",
  ];

  const allFabrics = Array.from(
    new Set([
      ...standardFabrics,
      ...fabrics.map((f) => f.toUpperCase().trim()).filter(Boolean),
    ])
  );

  const formattedTopSelling = topProducts.map((p) => {
    let discountPercent = 0;
    if (p.discountPrice && p.discountPrice < p.price) {
      discountPercent = Math.round(
        ((p.price - p.discountPrice) / p.price) * 100
      );
    }
    const coverImage =
      p.images?.find((img) => img.isDefault) || p.images?.[0] || null;
    const hoverImage =
      p.images?.find((img) => img.isHover) || p.images?.[1] || coverImage;

    return {
      ...p.toObject(),
      discountPercent,
      computedBadge:
        p.customBadge ||
        (discountPercent > 0 ? `-${discountPercent}% OFF` : ""),
      coverImage,
      hoverImage,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        heroBanners: banners,
        wardrobeCategories: {
          eyebrow: "THE ATELIER COLLECTIONS",
          heading: "Curated by Wardrobe Category",
          subtext:
            "From daily breathable cambrics to exquisite raw silk festive bridals",
          categories,
        },
        topSellingApparel: {
          eyebrow: "🔥 HOT DEALS & HIGH DEMAND",
          heading: "Top Selling Apparel",
          fabricFilters: allFabrics,
          products: formattedTopSelling,
        },
        editorialSpotlight: spotlight,
      },
      "Homepage data aggregated successfully"
    )
  );
});
