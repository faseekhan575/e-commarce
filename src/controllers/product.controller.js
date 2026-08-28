import { getIO } from "../socket.js";
// ============================================================
// product.controller.js
// ============================================================

import mongoose from "mongoose";
import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Product } from "../models/product.model.js";
import { Category } from "../models/Category.model.js";
import uploadImage, {
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  cloudinary,
} from "../utils/cloudinary.js";


// ============================================================
// GET ALL PRODUCTS (PUBLIC)
// ============================================================
export const getAllProducts = asynchandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 12);
  const skip = (page - 1) * limit;

  const { category, search, minPrice, maxPrice, sort, inStock, isHot, isFeatured } = req.query;

  const query = { isActive: true };

  // hot & featured filters
  if (isHot !== undefined && isHot !== "") {
    query.isHot = isHot === "true" || isHot === true;
  }
  if (isFeatured !== undefined && isFeatured !== "") {
    query.isFeatured = isFeatured === "true" || isFeatured === true;
  }

  // category filter (can be category id or slug)
  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      query.category = category;
    } else {
      const catDoc = await Category.findOne({ slug: category.toLowerCase() });
      if (catDoc) query.category = catDoc._id;
    }
  }


  // search filter (title, description, tags)
  if (search) {
    query.$or = [
      { title: { $regex: search.trim(), $options: "i" } },
      { description: { $regex: search.trim(), $options: "i" } },
      { tags: { $regex: search.trim(), $options: "i" } },
    ];
  }

  // price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // stock filter
  if (inStock === "true") {
    query.stock = { $gt: 0 };
  }

  // sorting options
  let sortOption = { createdAt: -1 };
  if (sort === "price-asc") {
    sortOption = { price: 1 };
  } else if (sort === "price-desc") {
    sortOption = { price: -1 };
  } else if (sort === "popular") {
    sortOption = { "analytics.purchased": -1, "analytics.views": -1 };
  } else if (sort === "rating") {
    sortOption = { "analytics.purchased": -1 };
  }

  const [products, totalProducts] = await Promise.all([
    Product.find(query)
      .populate("category", "name slug image")
      .populate("createdBy", "fullname email")
      .sort(sortOption)
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
// GET HOT & FEATURED PRODUCTS (PUBLIC - Homepage Showcase)
// ============================================================
export const getHotProducts = asynchandler(async (req, res) => {
  const limit = Math.max(1, parseInt(req.query.limit) || 8);
  const { category, type } = req.query; // type: 'hot', 'featured', or default (both)

  const query = { isActive: true };

  if (type === "featured") {
    query.isFeatured = true;
  } else if (type === "hot") {
    query.isHot = true;
  } else {
    query.$or = [{ isHot: true }, { isFeatured: true }];
  }

  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      query.category = category;
    } else {
      const catDoc = await Category.findOne({ slug: category.toLowerCase() });
      if (catDoc) query.category = catDoc._id;
    }
  }

  const products = await Product.find(query)
    .populate("category", "name slug image")
    .populate("createdBy", "fullname")
    .sort({ "analytics.purchased": -1, createdAt: -1 })
    .limit(limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      products,
      "Hot products fetched successfully"
    )
  );
});

// ============================================================
// GET ALL PRODUCTS FOR ADMIN (ADMIN ONLY - Full Inventory View)
// ============================================================
export const getAdminProducts = asynchandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 15);
  const skip = (page - 1) * limit;

  const { category, search, stockStatus, isActive, isHot, isFeatured, sort } = req.query;

  const query = {};

  if (isActive !== undefined && isActive !== "") {
    query.isActive = isActive === "true";
  }

  if (isHot !== undefined && isHot !== "") {
    query.isHot = isHot === "true";
  }

  if (isFeatured !== undefined && isFeatured !== "") {
    query.isFeatured = isFeatured === "true";
  }

  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      query.category = category;
    } else {
      const catDoc = await Category.findOne({ slug: category.toLowerCase() });
      if (catDoc) query.category = catDoc._id;
    }
  }

  if (search) {
    query.$or = [
      { title: { $regex: search.trim(), $options: "i" } },
      { description: { $regex: search.trim(), $options: "i" } },
      { tags: { $regex: search.trim(), $options: "i" } },
    ];
  }

  // Stock status filter
  if (stockStatus === "out_of_stock") {
    query.stock = { $lte: 0 };
  } else if (stockStatus === "low_stock") {
    query.stock = { $gt: 0, $lte: 5 };
  } else if (stockStatus === "in_stock") {
    query.stock = { $gt: 5 };
  }

  let sortOption = { createdAt: -1 };
  if (sort === "stock-asc") {
    sortOption = { stock: 1 };
  } else if (sort === "stock-desc") {
    sortOption = { stock: -1 };
  } else if (sort === "sales-desc") {
    sortOption = { "analytics.purchased": -1 };
  } else if (sort === "views-desc") {
    sortOption = { "analytics.views": -1 };
  } else if (sort === "price-asc") {
    sortOption = { price: 1 };
  } else if (sort === "price-desc") {
    sortOption = { price: -1 };
  }

  const [products, totalProducts, totalOutOfStock, totalLowStock, totalHot] =
    await Promise.all([
      Product.find(query)
        .populate("category", "name slug")
        .populate("createdBy", "fullname email")
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
      Product.countDocuments({ stock: { $lte: 0 } }),
      Product.countDocuments({ stock: { $gt: 0, $lte: 5 } }),
      Product.countDocuments({ isHot: true }),
    ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        products,
        totalProducts,
        totalOutOfStock,
        totalLowStock,
        totalHot,
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
      },
      "Admin products fetched successfully"
    )
  );
});

// ============================================================
// GET LOW STOCK & OUT OF STOCK PRODUCTS (ADMIN ONLY)
// ============================================================
export const getLowStockProducts = asynchandler(async (req, res) => {
  const threshold = parseInt(req.query.threshold) || 5;

  const [outOfStock, lowStock] = await Promise.all([
    Product.find({ stock: { $lte: 0 } })
      .populate("category", "name slug")
      .sort({ updatedAt: -1 }),
    Product.find({ stock: { $gt: 0, $lte: threshold } })
      .populate("category", "name slug")
      .sort({ stock: 1 }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        outOfStockCount: outOfStock.length,
        lowStockCount: lowStock.length,
        outOfStock,
        lowStock,
      },
      "Stock alerts fetched successfully"
    )
  );
});

// ============================================================
// GET SINGLE PRODUCT (PUBLIC / ADMIN)
// ============================================================
export const getProductById = asynchandler(async (req, res) => {
  const { productid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  // increment views counter
  const product = await Product.findByIdAndUpdate(
    productid,
    { $inc: { "analytics.views": 1 } },
    { new: true }
  )
    .populate("category", "name slug image")
    .populate("createdBy", "fullname email");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res.status(200).json(
    new ApiResponse(200, product, "Product fetched successfully")
  );
});

// ============================================================
// CREATE PRODUCT (ADMIN ONLY)
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
    isActive,
    isHot,
    isFeatured,
  } = req.body;

  if (!title || !description || !price || !category) {
    throw new ApiError(
      400,
      "Title, description, price, and category are required"
    );
  }

  if (!mongoose.Types.ObjectId.isValid(category)) {
    throw new ApiError(400, "Invalid category ID");
  }

  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    throw new ApiError(404, "Selected category does not exist");
  }

  let images = [];
  if (req.files && req.files.length > 0) {
    images = await uploadMultipleImages(req.files, {
      folder: "clothing_store/products",
    });
  } else if (req.file) {
    const uploaded = await uploadImage(req.file.buffer, {
      folder: "clothing_store/products",
    });
    if (uploaded) {
      images.push({
        url: uploaded.secure_url,
        public_id: uploaded.public_id,
        thumbnailUrl: uploaded.thumbnailUrl || uploaded.secure_url,
      });
    }
  }

  if (images.length === 0) {
    throw new ApiError(400, "At least one product image is required");
  }

  const product = await Product.create({
    title: title.trim(),
    description: description.trim(),
    price: Number(price),
    discountPrice: discountPrice ? Number(discountPrice) : null,
    stock: stock !== undefined ? Number(stock) : 0,
    category,
    tags: tags
      ? (Array.isArray(tags) ? tags : tags.split(","))
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    images,
    isActive:
      isActive !== undefined ? isActive === "true" || isActive === true : true,
    isHot: isHot !== undefined ? isHot === "true" || isHot === true : false,
    isFeatured:
      isFeatured !== undefined
        ? isFeatured === "true" || isFeatured === true
        : false,
    createdBy: req.user._id,
  });

  const populated = await Product.findById(product._id).populate(
    "category",
    "name slug"
  );

  return res.status(201).json(
    new ApiResponse(201, populated, "Product created successfully")
  );
});

// ============================================================
// UPDATE PRODUCT (ADMIN ONLY)
// ============================================================
export const updateProduct = asynchandler(async (req, res) => {
  const { productid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product ID format");
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
    isHot,
    isFeatured,
  } = req.body;

  if (title !== undefined) product.title = title.trim();
  if (description !== undefined) product.description = description.trim();
  if (price !== undefined) product.price = Number(price);
  if (discountPrice !== undefined) {
    product.discountPrice = discountPrice ? Number(discountPrice) : null;
  }
  if (stock !== undefined) product.stock = Math.max(0, Number(stock));
  if (category !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(category)) {
      throw new ApiError(400, "Invalid category ID");
    }
    const catExists = await Category.findById(category);
    if (!catExists) throw new ApiError(404, "Category does not exist");
    product.category = category;
  }
  if (isActive !== undefined) {
    product.isActive = isActive === "true" || isActive === true;
  }
  if (isHot !== undefined) {
    product.isHot = isHot === "true" || isHot === true;
  }
  if (isFeatured !== undefined) {
    product.isFeatured = isFeatured === "true" || isFeatured === true;
  }
  if (tags !== undefined) {
    product.tags = (Array.isArray(tags) ? tags : tags.split(","))
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // Upload any newly provided images
  if (req.files && req.files.length > 0) {
    const newImages = await uploadMultipleImages(req.files, {
      folder: "clothing_store/products",
    });
    product.images.push(...newImages);
  } else if (req.file) {
    const uploaded = await uploadImage(req.file.buffer, {
      folder: "clothing_store/products",
    });
    if (uploaded) {
      product.images.push({
        url: uploaded.secure_url,
        public_id: uploaded.public_id,
        thumbnailUrl: uploaded.thumbnailUrl || uploaded.secure_url,
      });
    }
  }

  await product.save();


  const updated = await Product.findById(product._id).populate(
    "category",
    "name slug"
  );

  return res.status(200).json(
    new ApiResponse(200, updated, "Product updated successfully")
  );
});

// ============================================================
// TOGGLE HOT / FEATURED STATUS (ADMIN ONLY)
// ============================================================
export const toggleHotProduct = asynchandler(async (req, res) => {
  const { productid } = req.params;
  const { isHot, isFeatured } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  const product = await Product.findById(productid);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (isHot !== undefined) {
    product.isHot = isHot === "true" || isHot === true;
  } else if (isFeatured === undefined) {
    product.isHot = !product.isHot;
  }

  if (isFeatured !== undefined) {
    product.isFeatured = isFeatured === "true" || isFeatured === true;
  }

  await product.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: product._id,
        title: product.title,
        isHot: product.isHot,
        isFeatured: product.isFeatured,
      },
      `Product is now marked as ${product.isHot ? "HOT" : "STANDARD"}`
    )
  );
});


// ============================================================
// QUICK STOCK UPDATE (ADMIN ONLY - One Click Stock Management)
// ============================================================
export const updateProductStock = asynchandler(async (req, res) => {
  const { productid } = req.params;
  const { stock, stockDelta } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  const product = await Product.findById(productid);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (stock !== undefined) {
    product.stock = Math.max(0, Number(stock));
  } else if (stockDelta !== undefined) {
    product.stock = Math.max(0, product.stock + Number(stockDelta));
  } else {
    throw new ApiError(400, "Provide either 'stock' or 'stockDelta'");
  }

  await product.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: product._id,
        title: product.title,
        stock: product.stock,
        isOutOfStock: product.stock === 0,
        isLowStock: product.stock > 0 && product.stock <= 5,
      },
      "Product stock updated successfully"
    )
  );
});

// ============================================================
// DELETE PRODUCT (ADMIN ONLY - cleans Cloudinary images)
// ============================================================
export const deleteProduct = asynchandler(async (req, res) => {
  const { productid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  const product = await Product.findById(productid);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Delete all product images from Cloudinary
  if (product.images && product.images.length > 0) {
    await deleteMultipleImages(product.images.map((img) => img.public_id));
  }

  await Product.findByIdAndDelete(productid);

  return res.status(200).json(
    new ApiResponse(200, {}, "Product and media deleted successfully")
  );
});

// ============================================================
// ADD IMAGE TO PRODUCT (ADMIN ONLY)
// ============================================================
export const addProductImage = asynchandler(async (req, res) => {
  const { productid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  if (!req.file) {
    throw new ApiError(400, "Image file is required");
  }

  const product = await Product.findById(productid);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const uploadedImage = await uploadImage(req.file.buffer, {
    folder: "clothing_store/products",
  });

  if (!uploadedImage) {
    throw new ApiError(500, "Failed to upload image to Cloudinary");
  }

  product.images.push({
    url: uploadedImage.secure_url,
    public_id: uploadedImage.public_id,
    thumbnailUrl: uploadedImage.thumbnailUrl || uploadedImage.secure_url,
  });

  await product.save();

  return res.status(200).json(
    new ApiResponse(200, product.images, "Image added to product successfully")
  );
});

// ============================================================
// DELETE SINGLE PRODUCT IMAGE (ADMIN ONLY)
// ============================================================
export const deleteProductImage = asynchandler(async (req, res) => {
  const { productid } = req.params;
  const { public_id } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  if (!public_id) {
    throw new ApiError(400, "Image public_id is required");
  }

  const product = await Product.findById(productid);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (product.images.length <= 1) {
    throw new ApiError(400, "Product must maintain at least one image");
  }

  // Delete from Cloudinary
  await deleteImage(public_id);

  // Remove from product images array
  product.images = product.images.filter((img) => img.public_id !== public_id);
  await product.save();

  return res.status(200).json(
    new ApiResponse(200, product.images, "Product image deleted successfully")
  );
});


// ============================================================
// GET PRODUCT ANALYTICS (ADMIN ONLY)
// ============================================================
export const getProductAnalytics = asynchandler(async (req, res) => {
  const { productid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  const product = await Product.findById(productid)
    .populate("category", "name slug")
    .select("title images price discountPrice stock analytics isActive createdAt");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const revenueGenerated = (product.analytics?.purchased || 0) * product.price;
  const conversionRate =
    product.analytics?.views > 0
      ? (
          ((product.analytics?.purchased || 0) / product.analytics.views) *
          100
        ).toFixed(2) + "%"
      : "0.00%";

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        product,
        revenueGenerated,
        conversionRate,
      },
      "Product analytics fetched successfully"
    )
  );
});

// ============================================================
// HELPER: TRACK ADD TO CART
// ============================================================
export const trackAddToCart = async (productId) => {
  try {
    await Product.findByIdAndUpdate(productId, {
      $inc: { "analytics.addedToCart": 1 },
    });
  } catch (err) {
    console.error("Error tracking add to cart:", err.message);
  }
};