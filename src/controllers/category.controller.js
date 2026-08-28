import mongoose from "mongoose";
import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Category } from "../models/Category.model.js";
import { Product } from "../models/product.model.js";
import uploadImage, { deleteImage } from "../utils/cloudinary.js";


// GET ALL CATEGORIES (public - includes product count & hot filter)
export const getAllCategories = asynchandler(async (req, res) => {
  const { isHot, isFeatured } = req.query;

  const query = {};
  if (isHot !== undefined && isHot !== "") {
    query.isHot = isHot === "true" || isHot === true;
  }
  if (isFeatured !== undefined && isFeatured !== "") {
    query.isFeatured = isFeatured === "true" || isFeatured === true;
  }

  const categories = await Category.find(query).sort({ isHot: -1, name: 1 });

  // Get product counts for each category
  const productCounts = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);

  const countMap = {};
  productCounts.forEach((item) => {
    countMap[item._id?.toString()] = item.count;
  });

  const categoriesWithCount = categories.map((cat) => ({
    ...cat.toObject(),
    productCount: countMap[cat._id.toString()] || 0,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      categoriesWithCount,
      "Categories fetched successfully"
    )
  );
});

// GET HOT CATEGORIES (public - for frontpage showcase)
export const getHotCategories = asynchandler(async (req, res) => {
  const limit = Math.max(1, parseInt(req.query.limit) || 6);

  const categories = await Category.find({
    $or: [{ isHot: true }, { isFeatured: true }],
  })
    .sort({ createdAt: -1 })
    .limit(limit);

  const productCounts = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);

  const countMap = {};
  productCounts.forEach((item) => {
    countMap[item._id?.toString()] = item.count;
  });

  const hotCategories = categories.map((cat) => ({
    ...cat.toObject(),
    productCount: countMap[cat._id.toString()] || 0,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      hotCategories,
      "Hot categories fetched successfully"
    )
  );
});

// GET SINGLE CATEGORY (public)
export const getCategoryById = asynchandler(async (req, res) => {
  const { categoryid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(categoryid)) {
    throw new ApiError(400, "Invalid category ID format");
  }

  const category = await Category.findById(categoryid);
  if (!category) throw new ApiError(404, "Category not found");

  const productCount = await Product.countDocuments({
    category: category._id,
    isActive: true,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { ...category.toObject(), productCount },
      "Category fetched successfully"
    )
  );
});

// CREATE CATEGORY (admin only)
export const createCategory = asynchandler(async (req, res) => {
  const { name, slug, isHot, isFeatured } = req.body;
  if (!name || !slug) {
    throw new ApiError(400, "Category name and slug are required");
  }

  const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, "-");

  const existing = await Category.findOne({
    $or: [{ slug: cleanSlug }, { name: name.trim() }],
  });

  if (existing) {
    throw new ApiError(
      409,
      "A category with this name or slug already exists"
    );
  }

  let image = { url: "", public_id: "", thumbnailUrl: "" };
  if (req.file) {
    const uploaded = await uploadImage(req.file.buffer, {
      folder: "clothing_store/categories",
    });
    if (uploaded) {
      image = {
        url: uploaded.secure_url,
        public_id: uploaded.public_id,
        thumbnailUrl: uploaded.thumbnailUrl || uploaded.secure_url,
      };
    }
  }

  const category = await Category.create({
    name: name.trim(),
    slug: cleanSlug,
    image,
    isHot: isHot !== undefined ? isHot === "true" || isHot === true : false,
    isFeatured:
      isFeatured !== undefined
        ? isFeatured === "true" || isFeatured === true
        : false,
    createdBy: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, category, "Category created successfully"));
});

// UPDATE CATEGORY (admin only)
export const updateCategory = asynchandler(async (req, res) => {
  const { categoryid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(categoryid)) {
    throw new ApiError(400, "Invalid category ID format");
  }

  const category = await Category.findById(categoryid);
  if (!category) throw new ApiError(404, "Category not found");

  const { name, slug, isHot, isFeatured } = req.body;

  if (name) category.name = name.trim();
  if (slug) category.slug = slug.trim().toLowerCase().replace(/\s+/g, "-");
  if (isHot !== undefined) {
    category.isHot = isHot === "true" || isHot === true;
  }
  if (isFeatured !== undefined) {
    category.isFeatured = isFeatured === "true" || isFeatured === true;
  }

  if (req.file) {
    if (category.image?.public_id) {
      await deleteImage(category.image.public_id);
    }
    const uploaded = await uploadImage(req.file.buffer, {
      folder: "clothing_store/categories",
    });
    if (uploaded) {
      category.image = {
        url: uploaded.secure_url,
        public_id: uploaded.public_id,
        thumbnailUrl: uploaded.thumbnailUrl || uploaded.secure_url,
      };
    }
  }

  await category.save();
  return res
    .status(200)
    .json(new ApiResponse(200, category, "Category updated successfully"));
});

// TOGGLE HOT CATEGORY (admin only)
export const toggleHotCategory = asynchandler(async (req, res) => {
  const { categoryid } = req.params;
  const { isHot, isFeatured } = req.body;

  if (!mongoose.Types.ObjectId.isValid(categoryid)) {
    throw new ApiError(400, "Invalid category ID format");
  }

  const category = await Category.findById(categoryid);
  if (!category) throw new ApiError(404, "Category not found");

  if (isHot !== undefined) {
    category.isHot = isHot === "true" || isHot === true;
  } else if (isFeatured === undefined) {
    category.isHot = !category.isHot;
  }

  if (isFeatured !== undefined) {
    category.isFeatured = isFeatured === "true" || isFeatured === true;
  }

  await category.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        isHot: category.isHot,
        isFeatured: category.isFeatured,
      },
      `Category is now marked as ${category.isHot ? "HOT" : "STANDARD"}`
    )
  );
});

// DELETE CATEGORY (admin only)
export const deleteCategory = asynchandler(async (req, res) => {
  const { categoryid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(categoryid)) {
    throw new ApiError(400, "Invalid category ID format");
  }

  const category = await Category.findById(categoryid);
  if (!category) throw new ApiError(404, "Category not found");

  // Check if products exist in this category
  const productCount = await Product.countDocuments({ category: categoryid });
  if (productCount > 0) {
    throw new ApiError(
      400,
      `Cannot delete category. ${productCount} products are still linked to this category.`
    );
  }

  if (category.image?.public_id) {
    await deleteImage(category.image.public_id);
  }

  await Category.findByIdAndDelete(categoryid);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Category deleted successfully"));
});

