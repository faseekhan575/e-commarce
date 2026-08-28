import mongoose, { Schema } from "mongoose";

const bannerSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    subtitle: {
      type: String,
      default: "",
      trim: true,
    },

    badge: {
      type: String,
      default: "NEW ARRIVALS",
      trim: true,
    },

    collectionType: {
      type: String,
      enum: [
        "new_arrivals",
        "monthly_drop",
        "summer_collection",
        "winter_collection",
        "flash_sale",
        "featured_hero",
        "custom",
      ],
      default: "featured_hero",
      index: true,
    },

    image: {
      url: { type: String, required: true },
      public_id: { type: String, default: "" },
      thumbnailUrl: { type: String, default: "" },
      bannerOptimizedUrl: { type: String, default: "" },
    },

    cta: {
      text: { type: String, default: "Shop Now", trim: true },
      link: { type: String, default: "/products", trim: true },
    },

    styling: {
      textPosition: {
        type: String,
        enum: ["left", "center", "right"],
        default: "left",
      },
      textColor: {
        type: String,
        default: "#FFFFFF",
      },
      overlayOpacity: {
        type: Number,
        default: 0.4, // 0.0 - 1.0 (creates a sleek dark luxury gradient over any photo)
      },
      theme: {
        type: String,
        enum: ["dark", "light", "gradient", "minimal"],
        default: "dark",
      },
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    priority: {
      type: Number,
      default: 0,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Banner = mongoose.model("Banner", bannerSchema);
