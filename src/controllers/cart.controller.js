// ============================================================
// cart.controller.js
// ============================================================

import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Cart } from "../models/cart.model.js";
import { Product } from "../models/product.model.js";
import { trackAddToCart } from "./product.controller.js";

const POPULATE_FIELDS =
  "title images price discountPrice stock sizes sizeVariants colors fabric fit isActive category";

// GET MY CART
export const getCart = asynchandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.product",
    POPULATE_FIELDS
  );

  if (!cart) {
    return res.status(200).json(new ApiResponse(200, { items: [] }, "Cart is empty"));
  }

  res.status(200).json(new ApiResponse(200, cart, "Cart fetched successfully"));
});

// ADD TO CART (WITH SIZE & COLOR SUPPORT)
export const addToCart = asynchandler(async (req, res) => {
  const { productId, quantity = 1, size = "M", color = "" } = req.body;
  if (!productId) throw new ApiError(400, "Product id is required");

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, "Product not found");
  if (!product.isActive) throw new ApiError(400, "Product is not available");

  // Check size-specific availability
  if (size && product.sizeVariants && product.sizeVariants.length > 0) {
    const sizeVar = product.sizeVariants.find(
      (v) => v.size.toUpperCase() === size.toUpperCase()
    );
    if (sizeVar) {
      if (!sizeVar.isAvailable || sizeVar.stock <= 0) {
        throw new ApiError(400, `Size '${size}' is currently out of stock`);
      }
    }
  } else if (product.stock < quantity) {
    throw new ApiError(400, "Not enough stock available");
  }

  const activePrice = product.discountPrice || product.price;
  let cart = await Cart.findOne({ user: req.user._id });

  const chosenSize = size.toUpperCase().trim();
  const chosenColor = color.trim();

  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [
        {
          product: productId,
          quantity: Number(quantity),
          size: chosenSize,
          color: chosenColor,
          price: activePrice,
        },
      ],
    });
  } else {
    // Check if item with exact same product, size, and color already in cart
    const existingItem = cart.items.find(
      (i) =>
        i.product.toString() === productId &&
        (i.size || "M") === chosenSize &&
        (i.color || "") === chosenColor
    );

    if (existingItem) {
      existingItem.quantity += Number(quantity);
      existingItem.price = activePrice;
    } else {
      cart.items.push({
        product: productId,
        quantity: Number(quantity),
        size: chosenSize,
        color: chosenColor,
        price: activePrice,
      });
    }
    await cart.save();
  }

  await trackAddToCart(productId);

  const populated = await Cart.findById(cart._id).populate(
    "items.product",
    POPULATE_FIELDS
  );
  res.status(200).json(new ApiResponse(200, populated, "Added to cart successfully"));
});

// REMOVE ITEM FROM CART
export const removeFromCart = asynchandler(async (req, res) => {
  const { productId, size, color, itemId } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new ApiError(404, "Cart not found");

  if (itemId) {
    cart.items = cart.items.filter((i) => i._id.toString() !== itemId);
  } else if (productId) {
    cart.items = cart.items.filter((i) => {
      const matchProduct = i.product.toString() === productId;
      const matchSize = size ? (i.size || "M") === size.toUpperCase() : true;
      const matchColor = color ? (i.color || "") === color : true;
      return !(matchProduct && matchSize && matchColor);
    });
  } else {
    throw new ApiError(400, "Item identifier is required to remove");
  }

  await cart.save();

  const populated = await Cart.findById(cart._id).populate(
    "items.product",
    POPULATE_FIELDS
  );
  res.status(200).json(new ApiResponse(200, populated, "Item removed from cart"));
});

// CLEAR CART
export const clearCart = asynchandler(async (req, res) => {
  await Cart.findOneAndDelete({ user: req.user._id });
  res.status(200).json(new ApiResponse(200, { items: [] }, "Cart cleared"));
});

// UPDATE QUANTITY
export const updateQuantity = asynchandler(async (req, res) => {
  const { productId, quantity, size, color, itemId } = req.body;
  if (!quantity || quantity < 1) throw new ApiError(400, "Quantity must be at least 1");

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new ApiError(404, "Cart not found");

  let item = null;
  if (itemId) {
    item = cart.items.find((i) => i._id.toString() === itemId);
  } else if (productId) {
    item = cart.items.find(
      (i) =>
        i.product.toString() === productId &&
        (size ? (i.size || "M") === size.toUpperCase() : true) &&
        (color ? (i.color || "") === color : true)
    );
  }

  if (!item) throw new ApiError(404, "Item not found in cart");

  item.quantity = Number(quantity);
  await cart.save();

  const populated = await Cart.findById(cart._id).populate(
    "items.product",
    POPULATE_FIELDS
  );
  res.status(200).json(new ApiResponse(200, populated, "Quantity updated"));
});