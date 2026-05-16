// ============================================================
// product.controller.js
// ============================================================

import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Product } from "../models/product.model.js";
import uploadImage, { cloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";


// ============================================================
// GET ALL PRODUCTS (PUBLIC)
// ============================================================
export const getAllProducts = asynchandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 8;
  const skip = (page - 1) * limit;

  const category = req.query.category || null;
  const search = req.query.search || null;

  const query = {
    isActive: true,
  };

  // category filter
  if (category) {
    query.category = category;
  }

  // search filter
  if (search) {
    query.$or = [
      {
        title: {
          $regex: search,
          $options: "i",
        },
      },
      {
        description: {
          $regex: search,
          $options: "i",
        },
      },
      {
        tags: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  const [products, totalProducts] = await Promise.all([
    Product.find(query)
      .populate("category", "name slug")
      .populate("createdBy", "fullname email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Product.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        products,
        totalProducts,
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
      },
      "Products fetched successfully"
    )
  );
});

// ============================================================
// GET SINGLE PRODUCT (PUBLIC)
// ============================================================
export const getProductById = asynchandler(async (req, res) => {
  const { productid } = req.params;

  // validate object id
  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product id");
  }

  const product = await Product.findByIdAndUpdate(
    productid,
    {
      $inc: {
        "analytics.views": 1,
      },
    },
    {
      new: true,
    }
  )
    .populate("category", "name slug")
    .populate("createdBy", "fullname email");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      product,
      "Product fetched successfully"
    )
  );
});

// ============================================================
// CREATE PRODUCT (ADMIN)
// ============================================================
export const createProduct = asynchandler(async (req, res) => {
  const {
    title,
    description,
    price,
    discountPrice,
    stock,
    category,
    tags,
  } = req.body;

  // validations
  if (!title || !description || !price || !category) {
    throw new ApiError(
      400,
      "Title, description, price and category are required"
    );
  }

  // validate images
  if (!req.files || req.files.length === 0) {
    throw new ApiError(
      400,
      "At least one product image is required"
    );
  }

  // upload images
  const uploadedImages = await Promise.all(
    req.files.map((file) => uploadImage(file.buffer))
  );

  const images = uploadedImages.map((img) => ({
    url: img.secure_url,
    public_id: img.public_id,
  }));

  // create product
  const product = await Product.create({
    title,
    description,
    price,
    discountPrice: discountPrice || null,
    stock: stock || 0,
    category,
    tags: tags
      ? tags.split(",").map((tag) => tag.trim())
      : [],
    images,
    createdBy: req.user._id,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      product,
      "Product created successfully"
    )
  );
});

// ============================================================
// UPDATE PRODUCT (ADMIN)
// ============================================================
export const updateProduct = asynchandler(async (req, res) => {
  const { productid } = req.params;

  // validate object id
  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product id");
  }

  const product = await Product.findById(productid);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const {
    title,
    description,
    price,
    discountPrice,
    stock,
    category,
    tags,
    isActive,
  } = req.body;

  // update fields
  if (title !== undefined) {
    product.title = title;
  }

  if (description !== undefined) {
    product.description = description;
  }

  if (price !== undefined) {
    product.price = price;
  }

  if (discountPrice !== undefined) {
    product.discountPrice = discountPrice;
  }

  if (stock !== undefined) {
    product.stock = stock;
  }

  if (category !== undefined) {
    product.category = category;
  }

  if (isActive !== undefined) {
    product.isActive = isActive;
  }

  if (tags !== undefined) {
    product.tags = tags
      .split(",")
      .map((tag) => tag.trim());
  }

  // upload new images
  if (req.files && req.files.length > 0) {
    const uploadedImages = await Promise.all(
      req.files.map((file) => uploadImage(file.buffer))
    );

    const newImages = uploadedImages.map((img) => ({
      url: img.secure_url,
      public_id: img.public_id,
    }));

    product.images.push(...newImages);
  }

  await product.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      product,
      "Product updated successfully"
    )
  );
});

// ============================================================
// DELETE PRODUCT (ADMIN)
// ============================================================
export const deleteProduct = asynchandler(async (req, res) => {
  const { productid } = req.params;

  // validate object id
  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product id");
  }

  const product = await Product.findById(productid);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // delete images from cloudinary
  if (product.images && product.images.length > 0) {
    await Promise.all(
      product.images.map((img) =>
        cloudinary.uploader.destroy(img.public_id)
      )
    );
  }

  await Product.findByIdAndDelete(productid);

  return res.status(200).json(
    new ApiResponse(
      200,
      {},
      "Product deleted successfully"
    )
  );
});

// ============================================================
// ADD PRODUCT IMAGE (ADMIN)
// ============================================================
export const addProductImage = asynchandler(async (req, res) => {
  const { productid } = req.params;

  // validate object id
  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product id");
  }

  if (!req.file) {
    throw new ApiError(400, "Image is required");
  }

  const product = await Product.findById(productid);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const uploadedImage = await uploadImage(req.file.buffer);

  product.images.push({
    url: uploadedImage.secure_url,
    public_id: uploadedImage.public_id,
  });

  await product.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      product.images,
      "Image added successfully"
    )
  );
});

// ============================================================
// DELETE PRODUCT IMAGE (ADMIN)
// ============================================================
export const deleteProductImage = asynchandler(async (req, res) => {
  const { productid } = req.params;
  const { public_id } = req.body;

  // validate object id
  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product id");
  }

  if (!public_id) {
    throw new ApiError(400, "public_id is required");
  }

  const product = await Product.findById(productid);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // delete image from cloudinary
  await cloudinary.uploader.destroy(public_id);

  // remove image from database
  product.images = product.images.filter(
    (img) => img.public_id !== public_id
  );

  await product.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      product.images,
      "Image deleted successfully"
    )
  );
});

// ============================================================
// PRODUCT ANALYTICS (ADMIN)
// ============================================================
export const getProductAnalytics = asynchandler(async (req, res) => {
  const { productid } = req.params;

  // validate object id
  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product id");
  }

  const product = await Product.findById(productid).select(
    "title analytics stock price"
  );

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      product,
      "Analytics fetched successfully"
    )
  );
});

// ============================================================
// TRACK ADD TO CART
// ============================================================
export const trackAddToCart = async (productId) => {
  await Product.findByIdAndUpdate(productId, {
    $inc: {
      "analytics.addedToCart": 1,
    },
  });
};