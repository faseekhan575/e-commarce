// ============================================================
// product.controller.js
// ============================================================

import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Product } from "../models/product.model.js";
import uploadImage from "../utils/cloudinary.js";
import cloudinary from "../utils/cloudinary.js";

// GET ALL PRODUCTS (public, with pagination + filter)
export const getAllProducts = asynchandler(async (req, res) => {
  const page     = parseInt(req.query.page)     || 1;
  const limit    = parseInt(req.query.limit)    || 8;
  const skip     = (page - 1) * limit;
  const category = req.query.category || null;
  const search   = req.query.search   || null;

  const query = { isActive: true };
  if (category) query.category = category;
  if (search)   query.$or = [
    { title:       { $regex: search, $options: "i" } },
    { description: { $regex: search, $options: "i" } },
    { tags:        { $regex: search, $options: "i" } },
  ];

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("category", "name slug")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Product.countDocuments(query),
  ]);

  res.status(200).json(new ApiResponse(200, {
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }, "Products fetched successfully"));
});

// GET SINGLE PRODUCT (public) — increments views
export const getProductById = asynchandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $inc: { "analytics.views": 1 } },
    { new: true }
  ).populate("category", "name slug").populate("createdBy", "fullname");

  if (!product) throw new ApiError(404, "Product not found");
  res.status(200).json(new ApiResponse(200, product, "Product fetched successfully"));
});

// CREATE PRODUCT (admin only)
export const createProduct = asynchandler(async (req, res) => {
  const { title, description, price, discountPrice, stock, category, tags } = req.body;

  if (!title || !description || !price || !category) {
    throw new ApiError(400, "Title, description, price and category are required");
  }

  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "At least one product image is required");
  }

  // upload all images to cloudinary
  const imageUploads = await Promise.all(
    req.files.map((file) => uploadImage(file.buffer))
  );

  const images = imageUploads.map((img) => ({
    url:       img.secure_url,
    public_id: img.public_id,
  }));

  const product = await Product.create({
    title,
    description,
    price,
    discountPrice: discountPrice || null,
    stock:         stock         || 0,
    category,
    tags:          tags ? tags.split(",").map((t) => t.trim()) : [],
    images,
    createdBy: req.user._id,
  });

  res.status(201).json(new ApiResponse(201, product, "Product created successfully"));
});

// UPDATE PRODUCT (admin only)
export const updateProduct = asynchandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");

  const { title, description, price, discountPrice, stock, category, tags, isActive } = req.body;

  if (title)         product.title         = title;
  if (description)   product.description   = description;
  if (price)         product.price         = price;
  if (discountPrice) product.discountPrice = discountPrice;
  if (stock)         product.stock         = stock;
  if (category)      product.category      = category;
  if (isActive !== undefined) product.isActive = isActive;
  if (tags)          product.tags          = tags.split(",").map((t) => t.trim());

  await product.save();
  res.status(200).json(new ApiResponse(200, product, "Product updated successfully"));
});

// ADD IMAGE TO PRODUCT (admin — + icon on frontend)
export const addProductImage = asynchandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Image is required");

  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");

  const uploaded = await uploadImage(req.file.buffer);
  product.images.push({ url: uploaded.secure_url, public_id: uploaded.public_id });
  await product.save();

  res.status(200).json(new ApiResponse(200, product.images, "Image added successfully"));
});

// DELETE ONE IMAGE FROM PRODUCT (admin)
export const deleteProductImage = asynchandler(async (req, res) => {
  const { public_id } = req.body;
  if (!public_id) throw new ApiError(400, "public_id is required");

  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");

  await cloudinary.uploader.destroy(public_id);
  product.images = product.images.filter((img) => img.public_id !== public_id);
  await product.save();

  res.status(200).json(new ApiResponse(200, product.images, "Image deleted successfully"));
});

// DELETE PRODUCT (admin only)
export const deleteProduct = asynchandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");

  // delete all images from cloudinary
  await Promise.all(
    product.images.map((img) => cloudinary.uploader.destroy(img.public_id))
  );

  await Product.findByIdAndDelete(req.params.id);
  res.status(200).json(new ApiResponse(200, {}, "Product deleted successfully"));
});

// TRACK ADD TO CART analytics (called from cart controller)
export const trackAddToCart = async (productId) => {
  await Product.findByIdAndUpdate(productId, { $inc: { "analytics.addedToCart": 1 } });
};