import mongoose, { Schema } from "mongoose";

const categorySchema = new Schema({

  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,  // e.g "Electronics" → "electronics"
    trim: true,
  },

  image: {
    url:       { type: String, default: "" },
    public_id: { type: String, default: "" },
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

}, { timestamps: true });

export const Category = mongoose.model("Category", categorySchema);