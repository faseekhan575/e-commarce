import mongoose, { Schema } from "mongoose";

const sizeVariantSchema = new Schema(
  {
    size: {
      type: String,
      required: true,
      trim: true,
      uppercase: true, // e.g. XS, S, M, L, XL, XXL, 32, 34
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const colorVariantSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    hex: {
      type: String,
      trim: true,
      default: "#000000",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const productSchema = new Schema(
  {
    title: {
      type: String,
      default: "New Fashion Product",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },


    discountPrice: {
      type: Number,
      default: null,
      min: 0,
    },

    // 💰 Financials & Profit Accounting
    costPrice: {
      type: Number,
      default: 0,
      min: 0, // Cost to produce or procure
    },

    sku: {
      type: String,
      trim: true,
      default: "",
    },

    // 👕 Fashion & Garment Specifications
    fabric: {
      type: String,
      trim: true,
      default: "100% Premium Cotton", // e.g. Cambric, Luxury Lawn, Raw Silk, Pure Chiffon, Woven Jacquard, Linen & Cotton, Velvet
    },

    fabricType: {
      type: String,
      trim: true,
      default: "Luxury Lawn", // Clean fabric filter key e.g. "Cambric", "Luxury Lawn", "Raw Silk", "Pure Chiffon", "Woven Jacquard", "Linen & Cotton"
      index: true,
    },

    productTypeTag: {
      type: String,
      trim: true,
      default: "", // e.g. "PRINTED | CAMBRIC", "EMBROIDERED | LUXURY LAWN", "JACQUARD | 2 PIECE", "LUXURY PRET | RAW SILK"
    },

    customBadge: {
      type: String,
      trim: true,
      default: "", // e.g. "-14% OFF", "-15% OFF", "NEW DROP", "HOT SELLER"
    },

    dispatchBadge: {
      type: String,
      trim: true,
      default: "Ready to Dispatch in 24h",
    },

    fit: {
      type: String,
      trim: true,
      default: "Regular Fit", // e.g. Slim Fit, Regular Fit, Oversized, Relaxed Fit
    },

    season: {
      type: String,
      trim: true,
      default: "All Season", // e.g. Summer, Winter, Spring, Festive, All Season
    },

    careInstructions: {
      type: String,
      trim: true,
      default: "Machine wash cold with like colors. Do not bleach. Iron low.",
    },


    // 📏 Sizes & Detailed Inventory Variants
    sizes: {
      type: [String],
      default: ["S", "M", "L", "XL"], // Quick array of active sizes
    },

    sizeVariants: {
      type: [sizeVariantSchema],
      default: [
        { size: "S", stock: 10, isAvailable: true },
        { size: "M", stock: 15, isAvailable: true },
        { size: "L", stock: 10, isAvailable: true },
        { size: "XL", stock: 5, isAvailable: true },
      ],
    },

    // 🎨 Color Variants
    colors: {
      type: [colorVariantSchema],
      default: [],
    },

    // 📐 Size Guide Dimensions (inches/cm)
    sizeGuide: {
      chest: { type: String, default: "" },
      length: { type: String, default: "" },
      shoulder: { type: String, default: "" },
      waist: { type: String, default: "" },
      chartUrl: { type: String, default: "" },
    },

    // 🖼️ Product Gallery (isDefault: main cover image, isHover: mouse hover image)
    images: [
      {
        url: { type: String, default: "" },
        public_id: { type: String, default: "" },
        thumbnailUrl: { type: String, default: "" },
        isDefault: { type: Boolean, default: false },
        isHover: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
      },
    ],

    // Overall total stock (calculated from sizeVariants or general stock)
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    analytics: {
      views: { type: Number, default: 0 },
      addedToCart: { type: Number, default: 0 },
      purchased: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      totalProfit: { type: Number, default: 0 },
    },


    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isHot: {
      type: Boolean,
      default: false,
      index: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Auto-sync overall stock with sizeVariants if variants are provided
productSchema.pre("save", function () {
  if (this.sizeVariants && this.sizeVariants.length > 0) {
    const totalVariantStock = this.sizeVariants.reduce(
      (acc, v) => acc + (Number(v.stock) || 0),
      0
    );
    if (totalVariantStock > 0 || this.isModified("sizeVariants")) {
      this.stock = totalVariantStock;
    }
  }
});

export const Product = mongoose.model("Product", productSchema);