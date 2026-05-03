import mongoose, { Schema } from "mongoose";

const productSchema = new Schema({

  title: {
    type: String,
    required: true,
    trim: true,
  },

  description: {
    type: String,
    required: true,
    trim: true,
  },

  price: {
    type: Number,
    required: true,
  },

  discountPrice: {
    type: Number,
    default: null,
  },

  // images[0] = main image, rest = additional images added via + icon
  images: [
    {
      url:       { type: String, default: "" },
      public_id: { type: String, default: "" },
    }
  ],

  stock: {
    type: Number,
    default: 0,
  },

  category: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    required: true,
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
    views:       { type: Number, default: 0 },
    addedToCart: { type: Number, default: 0 },
    purchased:   { type: Number, default: 0 },
  },

  isActive: {
    type: Boolean,
    default: true,
  },

}, { timestamps: true });

export const Product = mongoose.model("Product", productSchema);