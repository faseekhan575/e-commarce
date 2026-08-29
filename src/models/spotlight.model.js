import mongoose, { Schema } from "mongoose";

const spotlightSchema = new Schema(
  {
    eyebrow: {
      type: String,
      default: "FESTIVE EDITORIAL 2026",
      trim: true,
    },

    title: {
      type: String,
      default: "Editorial Showcase",
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

    originalPrice: {
      type: Number,
      default: null,
      min: 0,
    },

    currency: {
      type: String,
      default: "PKR",
      trim: true,
    },

    dispatchBadge: {
      type: String,
      default: "✓ Ready to Dispatch in 24h",
      trim: true,
    },

    // Interactive Model Hotspot Pin on the Left Editorial Photo
    hotspot: {
      text: {
        type: String,
        default: "✨ Shop The Look",
        trim: true,
      },
      posX: {
        type: Number,
        default: 35, // Percentage from left (0 to 100)
      },
      posY: {
        type: Number,
        default: 42, // Percentage from top (0 to 100)
      },
    },

    // High Resolution Lookbook Photo
    image: {
      url: {
        type: String,
        default:
          "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80",
      },
      public_id: { type: String, default: "" },
      thumbnailUrl: { type: String, default: "" },
    },


    // Action Buttons
    primaryCta: {
      text: {
        type: String,
        default: "SHOP THIS COMPLETE OUTFIT",
        trim: true,
      },
      link: {
        type: String,
        default: "/products",
        trim: true,
      },
    },

    secondaryCta: {
      text: {
        type: String,
        default: "VIEW FULL LOOKBOOK",
        trim: true,
      },
      link: {
        type: String,
        default: "/lookbook/festive-2026",
        trim: true,
      },
    },

    // Optional direct association to a store product in inventory
    linkedProduct: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    sectionTag: {
      type: String,
      default: "festive_spotlight",
      trim: true,
      index: true,
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

export const Spotlight = mongoose.model("Spotlight", spotlightSchema);
