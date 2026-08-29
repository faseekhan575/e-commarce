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

export const createCategory = asynchandler(async (req, res) => {
  const { name, slug, subtitle, eyebrow, description, displayOrder, isHot, isFeatured } = req.body;

  const categoryName = (name && name.trim()) || "New Wardrobe Category";
  let cleanSlug =
    (slug && slug.trim().toLowerCase().replace(/\s+/g, "-")) ||
    categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  if (!cleanSlug) {
    cleanSlug = `category-${Date.now().toString().slice(-6)}`;
  }

  const existing = await Category.findOne({ slug: cleanSlug });
  if (existing) {
    cleanSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;
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
    subtitle: subtitle ? subtitle.trim() : "",
    eyebrow: eyebrow ? eyebrow.trim() : "",
    description: description ? description.trim() : "",
    displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
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

  const { name, slug, subtitle, eyebrow, description, displayOrder, isHot, isFeatured } = req.body;

  if (name) category.name = name.trim();
  if (slug) category.slug = slug.trim().toLowerCase().replace(/\s+/g, "-");
  if (subtitle !== undefined) category.subtitle = subtitle.trim();
  if (eyebrow !== undefined) category.eyebrow = eyebrow.trim();
  if (description !== undefined) category.description = description.trim();
  if (displayOrder !== undefined) category.displayOrder = Number(displayOrder);
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

// GET ALL PRODUCTS UNDER A CATEGORY (By ID or slug)
export const getCategoryProducts = asynchandler(async (req, res) => {
  const { categoryid } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 12));
  const skip = (page - 1) * limit;
  const { minPrice, maxPrice, isHot, isFeatured, sort, inStockOnly } = req.query;

  let categoryDoc;
  if (mongoose.Types.ObjectId.isValid(categoryid)) {
    categoryDoc = await Category.findById(categoryid);
  } else {
    categoryDoc = await Category.findOne({ slug: categoryid.toLowerCase() });
  }

  if (!categoryDoc) {
    throw new ApiError(404, "Category not found");
  }

  const filter = { category: categoryDoc._id, isActive: true };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (isHot !== undefined && isHot !== "") {
    filter.isHot = isHot === "true" || isHot === true;
  }
  if (isFeatured !== undefined && isFeatured !== "") {
    filter.isFeatured = isFeatured === "true" || isFeatured === true;
  }
  if (inStockOnly === "true") {
    filter.stock = { $gt: 0 };
  }

  const sortOptions = {};
  switch (sort) {
    case "price-asc":
      sortOptions.price = 1;
      break;
    case "price-desc":
      sortOptions.price = -1;
      break;
    case "popular":
      sortOptions["analytics.views"] = -1;
      break;
    case "newest":
    default:
      sortOptions.createdAt = -1;
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate("category", "name slug"),
    Product.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        category: categoryDoc,
        products,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      },
      `Products for category '${categoryDoc.name}' fetched successfully`
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



