import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        size: {
          type: String,
          default: "M",
          trim: true,
        },
        color: {
          type: String,
          default: "",
          trim: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        priceAtPurchase: {
          type: Number,
          required: true,
        },
        costPriceAtPurchase: {
          type: Number,
          default: 0,
        },
        itemProfit: {
          type: Number,
          default: 0,
        },
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
    },

    // 💰 Total Profit Margin Earned from this order
    totalProfit: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cod", "card", "jazzcash", "easypaisa"],
      default: "cod",
    },

    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      country: { type: String, required: true },
      zip: { type: String, required: true },
      phone: { type: String, default: "" },
    },

    // 🚚 Real-Time Courier Tracking & Dispatch Info
    trackingNumber: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    courier: {
      type: String,
      trim: true,
      default: "TCS Express", // TCS, Leopard, Trax, PostEx, DHL, FedEx
    },

    trackingUrl: {
      type: String,
      trim: true,
      default: "",
    },

    estimatedDelivery: {
      type: Date,
    },

    deliveredAt: {
      type: Date,
    },

    paidAt: {
      type: Date,
    },

    // 📍 Full Order Milestone Tracking Timeline
    timeline: [
      {
        status: { type: String, required: true },
        note: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    isPaid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);