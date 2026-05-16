// ============================================================
// cart.controller.js
// ============================================================

import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Cart } from "../models/cart.model.js";
import { Product } from "../models/product.model.js";
import { trackAddToCart } from "./product.controller.js";

const POPULATE_FIELDS = "title images price discountPrice stock isActive category";

// GET MY CART
export const getCart = asynchandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id })
    .populate("items.product", POPULATE_FIELDS);

  if (!cart) return res.status(200).json(new ApiResponse(200, { items: [] }, "Cart is empty"));
  res.status(200).json(new ApiResponse(200, cart, "Cart fetched successfully"));
});

// ADD TO CART
export const addToCart = asynchandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) throw new ApiError(400, "Product id is required");

  const product = await Product.findById(productId);
  if (!product)           throw new ApiError(404, "Product not found");
  if (!product.isActive)  throw new ApiError(400, "Product is not available");
  if (product.stock < quantity) throw new ApiError(400, "Not enough stock");

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({
      user:  req.user._id,
      items: [{ product: productId, quantity, price: product.price }],
    });
  } else {
    const existingItem = cart.items.find((i) => i.product.toString() === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity, price: product.price });
    }
    await cart.save();
  }

  await trackAddToCart(productId);

  // populate before sending response
  const populated = await Cart.findById(cart._id).populate("items.product", POPULATE_FIELDS);
  res.status(200).json(new ApiResponse(200, populated, "Added to cart successfully"));
});

// REMOVE ITEM FROM CART
export const removeFromCart = asynchandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId) throw new ApiError(400, "Product id is required");

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new ApiError(404, "Cart not found");

  cart.items = cart.items.filter((i) => i.product.toString() !== productId);
  await cart.save();

  const populated = await Cart.findById(cart._id).populate("items.product", POPULATE_FIELDS);
  res.status(200).json(new ApiResponse(200, populated, "Item removed from cart"));
});

// CLEAR CART
export const clearCart = asynchandler(async (req, res) => {
  await Cart.findOneAndDelete({ user: req.user._id });
  res.status(200).json(new ApiResponse(200, {}, "Cart cleared"));
});

// UPDATE QUANTITY
export const updateQuantity = asynchandler(async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || !quantity) throw new ApiError(400, "Product id and quantity are required");
  if (quantity < 1) throw new ApiError(400, "Quantity must be at least 1");

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new ApiError(404, "Cart not found");

  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) throw new ApiError(404, "Item not found in cart");

  item.quantity = quantity;
  await cart.save();

  const populated = await Cart.findById(cart._id).populate("items.product", POPULATE_FIELDS);
  res.status(200).json(new ApiResponse(200, populated, "Quantity updated"));
});