import mongoose, { Schema } from "mongoose";

const cartSchema = new Schema({

  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true, // one cart per user
  },

  items: [
    {
      product:  { type: Schema.Types.ObjectId, ref: "Product", required: true },
      quantity: { type: Number, required: true, min: 1 },
      price:    { type: Number, required: true }, // snapshot at time of adding
    }
  ],

}, { timestamps: true });

export const Cart = mongoose.model("Cart", cartSchema);