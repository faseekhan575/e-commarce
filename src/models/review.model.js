import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema({

  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },

  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },

  comment: {
    type: String,
    required: true,
    trim: true,
  },

  images: [
    {
      url:       { type: String, default: "" },
      public_id: { type: String, default: "" },
    }
  ],

}, { timestamps: true });

// one review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

export const Review = mongoose.model("Review", reviewSchema);