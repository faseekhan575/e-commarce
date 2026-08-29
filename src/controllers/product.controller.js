// ============================================================
// product.controller.js
// ============================================================

import mongoose from "mongoose";
import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Product } from "../models/product.model.js";
import { Category } from "../models/Category.model.js";
import { getIO } from "../socket.js";
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

  const {
    category,
    search,
    minPrice,
    maxPrice,
    sort,
    inStock,
    isHot,
    isFeatured,
    fabric,
  } = req.query;

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

  // fabric filter
  if (fabric && fabric.toLowerCase() !== "all" && fabric.toLowerCase() !== "all fabrics") {
    const cleanFabric = fabric.trim().replace(/[-_]/g, " ");
    query.$or = [
      { fabricType: { $regex: cleanFabric, $options: "i" } },
      { fabric: { $regex: cleanFabric, $options: "i" } },
      { productTypeTag: { $regex: cleanFabric, $options: "i" } },
    ];
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
      .populate("category", "name slug image subtitle")
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
    .populate("category", "name slug image subtitle")
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
// GET TOP SELLING APPAREL & FABRIC FILTERED PICKS (PUBLIC)
// ============================================================
export const getTopSellingProducts = asynchandler(async (req, res) => {
  const limit = Math.max(1, parseInt(req.query.limit) || 8);
  const { fabric, category, sort } = req.query;

  const query = { isActive: true };

  // Filter by fabric type (e.g. "Cambric", "Luxury Lawn", "Raw Silk", "Pure Chiffon", "Woven Jacquard", "Linen & Cotton")
  if (
    fabric &&
    fabric.toLowerCase() !== "all" &&
    fabric.toLowerCase() !== "all fabrics"
  ) {
    const cleanFabric = fabric.trim().replace(/[-_]/g, " ");
    query.$or = [
      { fabricType: { $regex: cleanFabric, $options: "i" } },
      { fabric: { $regex: cleanFabric, $options: "i" } },
      { productTypeTag: { $regex: cleanFabric, $options: "i" } },
    ];
  }

  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      query.category = category;
    } else {
      const catDoc = await Category.findOne({ slug: category.toLowerCase() });
      if (catDoc) query.category = catDoc._id;
    }
  }

  let sortCriteria = { "analytics.purchased": -1, isHot: -1, createdAt: -1 };
  if (sort === "price-low") sortCriteria = { price: 1 };
  if (sort === "price-high") sortCriteria = { price: -1 };
  if (sort === "discount") sortCriteria = { discountPrice: 1 };

  const products = await Product.find(query)
    .populate("category", "name slug image subtitle")
    .sort(sortCriteria)
    .limit(limit);

  // Return formatted products with computed discount percentage & fabric badges
  const formatted = products.map((p) => {
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
      formatted,
      "Top selling products fetched successfully"
    )
  );
});

// ============================================================
// GET AVAILABLE FABRICS LIST (PUBLIC - For Fabric Filter Pills)
// ============================================================
export const getAvailableFabrics = asynchandler(async (req, res) => {
  const standardFabrics = [
    "ALL FABRICS",
    "CAMBRIC",
    "LUXURY LAWN",
    "RAW SILK",
    "PURE CHIFFON",
    "WOVEN JACQUARD",
    "LINEN & COTTON",
  ];

  const dbFabrics = await Product.distinct("fabricType", { isActive: true });
  const allFabricOptions = Array.from(
    new Set([
      ...standardFabrics,
      ...dbFabrics.map((f) => f.toUpperCase().trim()).filter(Boolean),
    ])
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      allFabricOptions,
      "Available fabric filters fetched successfully"
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

  const { category, search, stockStatus, isActive, isHot, isFeatured, sort } =
    req.query;

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
    .populate("category", "name slug subtitle image")
    .populate("createdBy", "fullname email");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product fetched successfully"));
});

// Helper to parse arrays/objects from multipart form data or json
const parseArray = (input, fallback = []) => {
  if (!input) return fallback;
  if (Array.isArray(input)) return input;
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return input
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return fallback;
};

const parseObject = (input, fallback = {}) => {
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

// Helper to extract uploaded files safely from multer array, fields, or single file
const extractUploadedFiles = (req) => {
  if (!req) return [];
  if (req.files) {
    if (Array.isArray(req.files)) return req.files;
    if (typeof req.files === "object") {
      const files = [];
      if (Array.isArray(req.files.image)) files.push(...req.files.image);
      if (Array.isArray(req.files.images)) files.push(...req.files.images);
      return files;
    }
  }
  if (req.file) return [req.file];
  return [];
};

// ============================================================
// CREATE PRODUCT (ADMIN ONLY)
// ============================================================
export const createProduct = asynchandler(async (req, res) => {
  const {
    title,
    description,
    price,
    discountPrice,
    costPrice,
    stock,
    category,
    tags,
    isActive,
    isHot,
    isFeatured,
    sizes,
    sizeVariants,
    colors,
    fabric,
    fabricType,
    productTypeTag,
    customBadge,
    dispatchBadge,
    fit,
    season,
    sku,
    careInstructions,
    sizeGuide,
  } = req.body;

  const productTitle = (title && title.trim()) || "New Fashion Product";
  const productPrice =
    price !== undefined && price !== "" ? Math.max(0, Number(price)) : 0;
  const productDescription = (description && description.trim()) || "";

  // Resolve category safely without throwing
  let targetCategoryId = null;
  if (category && mongoose.Types.ObjectId.isValid(category)) {
    const catExists = await Category.findById(category);
    if (catExists) targetCategoryId = catExists._id;
  } else if (category && typeof category === "string") {
    const catDoc = await Category.findOne({
      $or: [{ slug: category.toLowerCase().trim() }, { name: category.trim() }],
    });
    if (catDoc) targetCategoryId = catDoc._id;
  }

  // Fallback to any existing category or create a default one
  if (!targetCategoryId) {
    let fallbackCat = await Category.findOne();
    if (!fallbackCat) {
      fallbackCat = await Category.create({
        name: "General Collection",
        slug: "general-collection",
        createdBy: req.user._id,
      });
    }
    targetCategoryId = fallbackCat._id;
  }

  const rawFiles = extractUploadedFiles(req);
  let images = [];
  if (rawFiles.length > 0) {
    images = await uploadMultipleImages(rawFiles, {
      folder: "clothing_store/products",
    });
  }

  // If no image uploaded, provide a default fashion placeholder without crashing
  if (images.length === 0) {
    images = [
      {
        url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
        public_id: "",
        thumbnailUrl:
          "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=400&q=80",
        isDefault: true,
        isHover: true,
        order: 0,
      },
    ];
  } else {
    images[0].isDefault = true;
    if (images.length > 1) {
      images[1].isHover = true;
    }
  }

  // Parse size lists and variants
  const parsedSizes = parseArray(sizes, ["S", "M", "L", "XL"]).map((s) =>
    typeof s === "string" ? s.toUpperCase().trim() : s
  );

  let parsedSizeVariants = parseArray(sizeVariants, []);
  if (parsedSizeVariants.length === 0 && parsedSizes.length > 0) {
    const defaultPerSizeStock = Math.max(
      1,
      Math.floor((Number(stock) || 40) / parsedSizes.length)
    );
    parsedSizeVariants = parsedSizes.map((sz) => ({
      size: sz,
      stock: defaultPerSizeStock,
      isAvailable: true,
    }));
  }

  const parsedColors = parseArray(colors, []);
  const parsedSizeGuide = parseObject(sizeGuide, {});

  const product = await Product.create({
    title: productTitle,
    description: productDescription,
    price: productPrice,
    discountPrice: discountPrice ? Number(discountPrice) : null,
    costPrice:
      costPrice !== undefined && costPrice !== ""
        ? Math.max(0, Number(costPrice))
        : 0,
    stock: stock !== undefined && stock !== "" ? Math.max(0, Number(stock)) : 0,
    category: targetCategoryId,
    tags: parseArray(tags, []).map((t) => t.trim()).filter(Boolean),
    sizes: parsedSizes,
    sizeVariants: parsedSizeVariants,
    colors: parsedColors,
    fabric: fabric ? fabric.trim() : "100% Premium Cotton",
    fabricType: fabricType ? fabricType.trim() : "Luxury Lawn",
    productTypeTag: productTypeTag ? productTypeTag.trim() : "",
    customBadge: customBadge ? customBadge.trim() : "",
    dispatchBadge: dispatchBadge
      ? dispatchBadge.trim()
      : "Ready to Dispatch in 24h",
    fit: fit ? fit.trim() : "Regular Fit",
    season: season ? season.trim() : "All Season",
    sku: sku ? sku.trim() : `CD-${Date.now().toString().slice(-6)}`,
    careInstructions: careInstructions
      ? careInstructions.trim()
      : "Machine wash cold with like colors. Do not bleach. Iron low.",
    sizeGuide: parsedSizeGuide,
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
    "name slug subtitle"
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
    sizes,
    sizeVariants,
    colors,
    fabric,
    fabricType,
    productTypeTag,
    customBadge,
    dispatchBadge,
    fit,
    season,
    sku,
    careInstructions,
    sizeGuide,
    costPrice,
  } = req.body;

  if (title !== undefined) product.title = title.trim();
  if (description !== undefined) product.description = description.trim();
  if (price !== undefined && price !== "") product.price = Number(price);
  if (discountPrice !== undefined) {
    product.discountPrice = discountPrice ? Number(discountPrice) : null;
  }
  if (costPrice !== undefined && costPrice !== "") {
    product.costPrice = Math.max(0, Number(costPrice));
  }
  if (stock !== undefined && stock !== "") {
    product.stock = Math.max(0, Number(stock));
  }
  if (fabricType !== undefined) product.fabricType = fabricType.trim();
  if (productTypeTag !== undefined) product.productTypeTag = productTypeTag.trim();
  if (customBadge !== undefined) product.customBadge = customBadge.trim();
  if (dispatchBadge !== undefined) product.dispatchBadge = dispatchBadge.trim();

  if (category !== undefined) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      const catExists = await Category.findById(category);
      if (catExists) product.category = catExists._id;
    }
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
    product.tags = parseArray(tags, []).map((t) => t.trim()).filter(Boolean);
  }

  // Fashion fields
  if (sizes !== undefined) {
    product.sizes = parseArray(sizes, []).map((s) =>
      typeof s === "string" ? s.toUpperCase().trim() : s
    );
  }
  if (sizeVariants !== undefined) {
    product.sizeVariants = parseArray(sizeVariants, []);
  }
  if (colors !== undefined) {
    product.colors = parseArray(colors, []);
  }
  if (fabric !== undefined) product.fabric = fabric.trim();
  if (fit !== undefined) product.fit = fit.trim();
  if (season !== undefined) product.season = season.trim();
  if (sku !== undefined) product.sku = sku.trim();
  if (careInstructions !== undefined) product.careInstructions = careInstructions.trim();
  if (sizeGuide !== undefined) product.sizeGuide = parseObject(sizeGuide, {});

  // Upload any newly provided images
  const newRawFiles = extractUploadedFiles(req);
  if (newRawFiles.length > 0) {
    const newImages = await uploadMultipleImages(newRawFiles, {
      folder: "clothing_store/products",
    });
    product.images.push(...newImages);
  }

  await product.save();

  const updated = await Product.findById(product._id).populate(
    "category",
    "name slug subtitle"
  );

  return res.status(200).json(
    new ApiResponse(200, updated, "Product updated successfully")
  );
});

// ============================================================
// 1-CLICK TOGGLE SIZE AVAILABILITY (ADMIN ONLY)
// ============================================================
export const toggleSizeAvailability = asynchandler(async (req, res) => {
  const { productid } = req.params;
  const { size, isAvailable } = req.body;

  if (!size) {
    throw new ApiError(400, "Size name is required (e.g. 'M', 'XL')");
  }

  const product = await Product.findById(productid);
  if (!product) throw new ApiError(404, "Product not found");

  const targetSize = size.toUpperCase().trim();
  let found = false;

  if (product.sizeVariants && product.sizeVariants.length > 0) {
    product.sizeVariants.forEach((v) => {
      if (v.size.toUpperCase() === targetSize) {
        v.isAvailable =
          isAvailable !== undefined ? Boolean(isAvailable) : !v.isAvailable;
        found = true;
      }
    });
  }

  if (!found) {
    product.sizeVariants.push({
      size: targetSize,
      stock: 10,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
    });
    if (!product.sizes.includes(targetSize)) {
      product.sizes.push(targetSize);
    }
  }

  await product.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: product._id,
        size: targetSize,
        sizeVariants: product.sizeVariants,
        sizes: product.sizes,
      },
      `Size ${targetSize} availability toggled successfully`
    )
  );
});

// ============================================================
// UPDATE SIZE STOCK (ADMIN ONLY)
// ============================================================
export const updateSizeStock = asynchandler(async (req, res) => {
  const { productid } = req.params;
  const { size, stock } = req.body;

  if (!size || stock === undefined) {
    throw new ApiError(400, "Both 'size' and 'stock' are required");
  }

  const product = await Product.findById(productid);
  if (!product) throw new ApiError(404, "Product not found");

  const targetSize = size.toUpperCase().trim();
  const newStock = Math.max(0, Number(stock));
  let found = false;

  if (product.sizeVariants && product.sizeVariants.length > 0) {
    product.sizeVariants.forEach((v) => {
      if (v.size.toUpperCase() === targetSize) {
        v.stock = newStock;
        v.isAvailable = newStock > 0;
        found = true;
      }
    });
  }

  if (!found) {
    product.sizeVariants.push({
      size: targetSize,
      stock: newStock,
      isAvailable: newStock > 0,
    });
    if (!product.sizes.includes(targetSize)) {
      product.sizes.push(targetSize);
    }
  }

  await product.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: product._id,
        size: targetSize,
        stock: newStock,
        totalStock: product.stock,
        sizeVariants: product.sizeVariants,
      },
      `Stock for size ${targetSize} updated to ${newStock}`
    )
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

// ============================================================// ============================================================
// ADD IMAGE(S) TO PRODUCT GALLERY (ADMIN ONLY)
// ============================================================
export const addProductImage = asynchandler(async (req, res) => {
  const { productid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  const rawFiles = extractUploadedFiles(req);
  if (rawFiles.length === 0) {
    throw new ApiError(400, "At least one image file is required");
  }

  const product = await Product.findById(productid);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const uploadedImages = await uploadMultipleImages(rawFiles, {
    folder: "clothing_store/products",
  });

  if (!uploadedImages || uploadedImages.length === 0) {
    throw new ApiError(500, "Failed to upload image(s) to Cloudinary");
  }

  product.images.push(...uploadedImages);
  await product.save();

  return res.status(200).json(
    new ApiResponse(200, product.images, `${uploadedImages.length} image(s) added to product successfully`)
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
// SET DEFAULT (COVER) IMAGE (ADMIN ONLY)
// ============================================================
export const setDefaultProductImage = asynchandler(async (req, res) => {
  const { productid } = req.params;
  const { public_id, imageIndex } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  const product = await Product.findById(productid);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (product.images.length === 0) {
    throw new ApiError(400, "Product has no images");
  }

  let found = false;
  product.images.forEach((img, idx) => {
    if (public_id && img.public_id === public_id) {
      img.isDefault = true;
      found = true;
    } else if (imageIndex !== undefined && idx === Number(imageIndex)) {
      img.isDefault = true;
      found = true;
    } else {
      img.isDefault = false;
    }
  });

  if (!found) {
    throw new ApiError(404, "Target image not found in product gallery");
  }

  await product.save();

  return res.status(200).json(
    new ApiResponse(200, product.images, "Default cover image updated successfully")
  );
});

// ============================================================
// SET HOVER IMAGE (ADMIN ONLY)
// ============================================================
export const setHoverProductImage = asynchandler(async (req, res) => {
  const { productid } = req.params;
  const { public_id, imageIndex } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  const product = await Product.findById(productid);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (product.images.length === 0) {
    throw new ApiError(400, "Product has no images");
  }

  let found = false;
  product.images.forEach((img, idx) => {
    if (public_id && img.public_id === public_id) {
      img.isHover = true;
      found = true;
    } else if (imageIndex !== undefined && idx === Number(imageIndex)) {
      img.isHover = true;
      found = true;
    } else {
      img.isHover = false;
    }
  });

  if (!found) {
    throw new ApiError(404, "Target image not found in product gallery");
  }

  await product.save();

  return res.status(200).json(
    new ApiResponse(200, product.images, "Hover image updated successfully")
  );
});

// ============================================================
// REORDER PRODUCT IMAGES (ADMIN ONLY)
// ============================================================
export const reorderProductImages = asynchandler(async (req, res) => {
  const { productid } = req.params;
  const { public_ids } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productid)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  if (!Array.isArray(public_ids) || public_ids.length === 0) {
    throw new ApiError(400, "public_ids array is required");
  }

  const product = await Product.findById(productid);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const imageMap = new Map();
  product.images.forEach((img) => imageMap.set(img.public_id, img));

  const reordered = [];
  public_ids.forEach((pid, idx) => {
    if (imageMap.has(pid)) {
      const img = imageMap.get(pid);
      img.order = idx;
      reordered.push(img);
      imageMap.delete(pid);
    }
  });

  // Append any images not explicitly listed
  imageMap.forEach((img) => reordered.push(img));

  product.images = reordered;
  await product.save();

  return res.status(200).json(
    new ApiResponse(200, product.images, "Product images reordered successfully")
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
    .select("title images price discountPrice costPrice stock sizeVariants analytics isActive sku createdAt");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const effectivePrice = product.discountPrice || product.price;
  const costPrice = product.costPrice || 0;
  const profitPerUnit = Math.max(0, effectivePrice - costPrice);
  const profitMarginPercent =
    effectivePrice > 0
      ? ((profitPerUnit / effectivePrice) * 100).toFixed(1) + "%"
      : "0%";
  const unitsSold = product.analytics?.purchased || 0;
  const totalRevenue = unitsSold * effectivePrice;
  const totalProfit = unitsSold * profitPerUnit;
  const currentInventoryCostValue = product.stock * costPrice;
  const potentialRetailValue = product.stock * effectivePrice;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        product,
        financials: {
          effectivePrice,
          costPrice,
          profitPerUnit,
          profitMarginPercent,
          unitsSold,
          totalRevenue,
          totalProfit,
          currentStock: product.stock,
          currentInventoryCostValue,
          potentialRetailValue,
          potentialRemainingProfit: potentialRetailValue - currentInventoryCostValue,
        },
        engagement: {
          views: product.analytics?.views || 0,
          addedToCart: product.analytics?.addedToCart || 0,
          conversionRate:
            (product.analytics?.views || 0) > 0
              ? (
                  ((product.analytics?.purchased || 0) /
                    product.analytics.views) *
                  100
                ).toFixed(2) + "%"
              : "0.00%",
        },
      },
      "Product analytics and profit metrics fetched successfully"
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