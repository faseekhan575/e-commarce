// ============================================================
// category.controller.js
// ============================================================

import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Category } from "../models/category.model.js";
import uploadImage from "../utils/cloudinary.js";
import cloudinary from "../utils/cloudinary.js";

// GET ALL CATEGORIES (public)
export const getAllCategories = asynchandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.status(200).json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

// CREATE CATEGORY (admin only)
export const createCategory = asynchandler(async (req, res) => {
  const { name, slug } = req.body;
  if (!name || !slug) throw new ApiError(400, "Name and slug are required");

  const existing = await Category.findOne({ slug });
  if (existing) throw new ApiError(409, "Category with this slug already exists");

  let image = { url: "", public_id: "" };
  if (req.file) {
    const uploaded = await uploadImage(req.file.buffer);
    image = { url: uploaded.secure_url, public_id: uploaded.public_id };
  }

  const category = await Category.create({
    name,
    slug:      slug.toLowerCase(),
    image,
    createdBy: req.user._id,
  });

  res.status(201).json(new ApiResponse(201, category, "Category created successfully"));
});

// UPDATE CATEGORY (admin only)
export const updateCategory = asynchandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");

  const { name, slug } = req.body;
  if (name) category.name = name;
  if (slug) category.slug = slug.toLowerCase();

  if (req.file) {
    if (category.image?.public_id) {
      await cloudinary.uploader.destroy(category.image.public_id);
    }
    const uploaded = await uploadImage(req.file.buffer);
    category.image = { url: uploaded.secure_url, public_id: uploaded.public_id };
  }

  await category.save();
  res.status(200).json(new ApiResponse(200, category, "Category updated successfully"));
});

// DELETE CATEGORY (admin only)
export const deleteCategory = asynchandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");

  if (category.image?.public_id) {
    await cloudinary.uploader.destroy(category.image.public_id);
  }

  await Category.findByIdAndDelete(req.params.id);
  res.status(200).json(new ApiResponse(200, {}, "Category deleted successfully"));
});