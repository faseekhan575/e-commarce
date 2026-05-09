import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asyncHandler.js";
import uploadImage from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";

// ─── CREATE PRODUCT ─────────────────────────────────────────
export const createProduct = asynchandler(async (req, res) => {
  const { title, description, price, discountPrice, stock, category, tags } = req.body;

  if (!title || !description || !price || !stock || !category) {
    throw new ApiError(400, "Please add all required fields");
  }

  if (!req.file) {
    throw new ApiError(400, "Product image is required");
  }

  const fileurl = await uploadImage(req.file.buffer);
  if (!fileurl) throw new ApiError(500, "Failed to upload image");

  const createdProduct = await Product.create({
    title,
    description,
    price,
    discountPrice: discountPrice || null,
    stock,
    category,
    tags:      tags ? tags.split(",").map((t) => t.trim()) : [],
    images:    [{ url: fileurl.secure_url, public_id: fileurl.public_id }],
    createdBy: req.user._id,
  });

  if (!createdProduct) {
    throw new ApiError(400, "Error while creating product, try again");
  }

  return res.status(201).json(
    new ApiResponse(201, createdProduct, "Product created successfully")
  );
});

// ─── UPDATE PRODUCT ─────────────────────────────────────────
export const updateProduct = asynchandler(async (req, res) => {  // ❌ was outside bracket
  const { productid } = req.params;
  const { title, description, price, discountPrice, stock, category, tags } = req.body;

  const product = await Product.findById(productid);
  if (!product) throw new ApiError(404, "Product not found");

  // ✅ image is optional on update
  let newImage = null;
  if (req.file) {
    // delete old main image from cloudinary first
    if (product.images[0]?.public_id) {
      await cloudinary.uploader.destroy(product.images[0].public_id);
    }
    const fileurl = await uploadImage(req.file.buffer);
    if (!fileurl) throw new ApiError(500, "Failed to upload image");
    newImage = { url: fileurl.secure_url, public_id: fileurl.public_id };
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    productid,
    {
      $set: {
        ...(title        && { title }),
        ...(description  && { description }),
        ...(price        && { price }),
        ...(discountPrice && { discountPrice }),
        ...(stock        && { stock }),
        ...(category     && { category }),
        ...(tags         && { tags: tags.split(",").map((t) => t.trim()) }),
        ...(newImage     && { "images.0": newImage }), // only update main image if new one uploaded
      },
    },
    { new: true }
  );

  if (!updatedProduct) {
    throw new ApiError(400, "Failed to update product, try again");  // ❌ was missing throw
  }

  return res.status(200).json(                                        // ❌ was throw not return res
    new ApiResponse(200, updatedProduct, "Product updated successfully")
  );
});

// ─── DELETE PRODUCT ─────────────────────────────────────────
export const deleteProduct = asynchandler(async (req, res) => {
  const { productid } = req.params;

  const product = await Product.findById(productid);
  if (!product) throw new ApiError(404, "Product not found");

  // ✅ delete all images from cloudinary first
  if (product.images?.length > 0) {
    await Promise.all(
      product.images.map((img) => cloudinary.uploader.destroy(img.public_id))
    );
  }

  await Product.findByIdAndDelete(productid);

  return res.status(200).json(                                       // ❌ was throw not return res
    new ApiResponse(200, {}, "Product deleted successfully")
  );
});

// ─── GET ALL PRODUCTS (public + pagination) ──────────────────
export const getAllProducts = asynchandler(async (req, res) => {
  const page     = parseInt(req.query.page)  || 1;
  const limit    = parseInt(req.query.limit) || 8;
  const skip     = (page - 1) * limit;
  const category = req.query.category || null;
  const search   = req.query.search   || null;

  const query = { isActive: true };
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { title:       { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags:        { $regex: search, $options: "i" } },
    ];
  }

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("category", "name slug")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Product.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }, "Products fetched successfully")
  );
});

// ─── GET SINGLE PRODUCT + increment views ────────────────────
export const getProductById = asynchandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.productid,
    { $inc: { "analytics.views": 1 } },
    { new: true }
  )
    .populate("category", "name slug")
    .populate("createdBy", "fullname");

  if (!product) throw new ApiError(404, "Product not found");

  return res.status(200).json(
    new ApiResponse(200, product, "Product fetched successfully")
  );
});

// ─── GET PRODUCT ANALYTICS (admin) ───────────────────────────
export const getProductAnalytics = asynchandler(async (req, res) => {
  const product = await Product.findById(req.params.productid)
    .select("title analytics stock price");

  if (!product) throw new ApiError(404, "Product not found");

  return res.status(200).json(
    new ApiResponse(200, product, "Analytics fetched successfully")
  );
});

// ─── ADD EXTRA IMAGE via + icon (admin) ──────────────────────
export const addProductImage = asynchandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Image is required");

  const product = await Product.findById(req.params.productid);
  if (!product) throw new ApiError(404, "Product not found");

  const uploaded = await uploadImage(req.file.buffer);
  if (!uploaded) throw new ApiError(500, "Failed to upload image");

  product.images.push({ url: uploaded.secure_url, public_id: uploaded.public_id });
  await product.save();

  return res.status(200).json(
    new ApiResponse(200, product.images, "Image added successfully")
  );
});

// ─── DELETE ONE IMAGE (admin) ─────────────────────────────────
export const deleteProductImage = asynchandler(async (req, res) => {
  const { public_id } = req.body;
  if (!public_id) throw new ApiError(400, "public_id is required");

  const product = await Product.findById(req.params.productid);
  if (!product) throw new ApiError(404, "Product not found");

  await cloudinary.uploader.destroy(public_id);
  product.images = product.images.filter((img) => img.public_id !== public_id);
  await product.save();

  return res.status(200).json(
    new ApiResponse(200, product.images, "Image deleted successfully")
  );
});