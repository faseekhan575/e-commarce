import mongoose, { Schema } from "mongoose";

const categorySchema = new Schema(
  {
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
      lowercase: true,
      trim: true,
    },

    subtitle: {
      type: String,
      default: "", // e.g. "PRET, CO-ORDS & KURTAS", "2-PIECE & 3-PIECE LAWN", "RAW SILK & VELVET FORMALS"
      trim: true,
    },

    eyebrow: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },


    image: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
      thumbnailUrl: { type: String, default: "" },
    },

    bannerImage: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },

    displayOrder: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

export const Category = mongoose.model("Category", categorySchema);
