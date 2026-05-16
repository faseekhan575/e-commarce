// ===========================================================
// order.controller.js
// ===========================================================

import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import { Order } from "../models/orders.model.js";
import { Product } from "../models/product.model.js";
import { Cart } from "../models/cart.model.js";
import { io } from "../index.js";
import { Parser } from "json2csv";

// ===========================================================
// PLACE ORDER
// ===========================================================

export const placeOrder = asynchandler(async (req, res) => {
  const { shippingAddress, paymentMethod } = req.body;

  // Validate shipping address
  if (
    !shippingAddress ||
    !shippingAddress.street ||
    !shippingAddress.city ||
    !shippingAddress.country ||
    !shippingAddress.zip
  ) {
    throw new ApiError(400, "Complete shipping address is required");
  }

  // Find cart
  const cart = await Cart.findOne({
    user: req.user._id,
  }).populate("items.product");

  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Cart is empty");
  }

  // Validate products + stock
  for (const item of cart.items) {
    if (!item.product) {
      throw new ApiError(404, "Product not found");
    }

    if (!item.product.isActive) {
      throw new ApiError(
        400,
        `${item.product.title} is no longer available`
      );
    }

    if (item.product.stock < item.quantity) {
      throw new ApiError(
        400,
        `Not enough stock for ${item.product.title}`
      );
    }
  }

  // Build order items
  const items = cart.items.map((item) => ({
    product: item.product._id,
    quantity: item.quantity,
    priceAtPurchase: item.product.price,
  }));

  // Calculate total
  const totalAmount = items.reduce(
    (acc, item) => acc + item.priceAtPurchase * item.quantity,
    0
  );

  // Create order
  const order = await Order.create({
    user: req.user._id,
    items,
    totalAmount,
    shippingAddress,
    paymentMethod: paymentMethod || "cod",
  });

  // Update stock + analytics
  await Promise.all(
    cart.items.map((item) =>
      Product.findByIdAndUpdate(item.product._id, {
        $inc: {
          stock: -item.quantity,
          "analytics.purchased": item.quantity,
        },
      })
    )
  );

  // Clear cart
  await Cart.findOneAndDelete({
    user: req.user._id,
  });

 // Socket notification
io.to("admin_room").emit("new_order", {
  orderId: order._id,
  totalAmount,
  createdAt: order.createdAt,
  userName: req.user.fullname,
});

  return res
    .status(201)
    .json(
      new ApiResponse(201, order, "Order placed successfully")
    );
});

// ===========================================================
// GET MY ORDERS
// ===========================================================

export const getMyOrders = asynchandler(async (req, res) => {
  const orders = await Order.find({
    user: req.user._id,
  })
    .populate("items.product", "title images price")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        orders,
        "Orders fetched successfully"
      )
    );
});

// ===========================================================
// GET ALL ORDERS (ADMIN)
// ===========================================================

export const getAllOrders = asynchandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const skip = (page - 1) * limit;

  const [orders, totalOrders] = await Promise.all([
    Order.find()
      .populate("user", "fullname email username")
      .populate("items.product", "title price images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Order.countDocuments(),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        totalOrders,
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
      },
      "All orders fetched successfully"
    )
  );
});

// ===========================================================
// UPDATE ORDER STATUS (ADMIN)
// ===========================================================

export const updateOrderStatus = asynchandler(async (req, res) => {
  const { status, paymentStatus } = req.body;

  // IMPORTANT FIX
  const order = await Order.findById(req.params.orderid);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Update order status
  if (status) {
    order.status = status;
  }

  // Update payment status
  if (paymentStatus) {
    order.paymentStatus = paymentStatus;
    order.isPaid = paymentStatus === "paid";
  }

  await order.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      order,
      "Order status updated successfully"
    )
  );
});

// ===========================================================
// DOWNLOAD ORDERS CSV (ADMIN)
// ===========================================================

export const downloadOrdersCSV = asynchandler(async (req, res) => {
  const orders = await Order.find()
    .populate("user", "fullname email")
    .populate("items.product", "title price");

  const formattedOrders = orders.map((order) => ({
    orderId: order._id,
    customerName: order.user?.fullname || "N/A",
    customerEmail: order.user?.email || "N/A",

    totalAmount: order.totalAmount,

    orderStatus: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,

    city: order.shippingAddress?.city || "N/A",
    country: order.shippingAddress?.country || "N/A",

    createdAt: order.createdAt,
  }));

  const parser = new Parser();

  const csv = parser.parse(formattedOrders);

  res.header("Content-Type", "text/csv");

  res.attachment("orders.csv");

  return res.send(csv);
});