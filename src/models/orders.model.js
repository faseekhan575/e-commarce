import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema({

  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  items: [
    {
      product:         { type: Schema.Types.ObjectId, ref: "Product", required: true },
      quantity:        { type: Number, required: true },
      priceAtPurchase: { type: Number, required: true }, // snapshot so price change doesn't affect old orders
    }
  ],

  totalAmount: {
    type: Number,
    required: true,
  },

  status: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },

  paymentStatus: {
    type: String,
    enum: ["unpaid", "paid", "refunded"],
    default: "unpaid",
  },

  paymentMethod: {
    type: String,
    enum: ["cod", "card", "jazzcash", "easypaisa"],
    default: "cod",
  },

  shippingAddress: {
    street:  { type: String, required: true },
    city:    { type: String, required: true },
    country: { type: String, required: true },
    zip:     { type: String, required: true },
  },

  isPaid: {
    type: Boolean,
    default: false,
  },

}, { timestamps: true });

export const Order = mongoose.model("Order", orderSchema);