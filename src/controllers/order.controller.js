// ===========================================================
// order.controller.js
// ===========================================================

import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Order } from "../models/orders.model.js";
import { Product } from "../models/product.model.js";
import { Cart } from "../models/cart.model.js";
import { Parser } from "json2csv";

// PLACE ORDER
export const placeOrder = asynchandler(async (req, res) => {
  const { shippingAddress, paymentMethod } = req.body;

  if (!shippingAddress?.street || !shippingAddress?.city ||
      !shippingAddress?.country || !shippingAddress?.zip) {
    throw new ApiError(400, "Complete shipping address is required");
  }

  const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
  if (!cart || cart.items.length === 0) throw new ApiError(400, "Cart is empty");

  // check stock for all items-----------------------
  for (const item of cart.items) {
    if (!item.product.isActive) throw new ApiError(400, `${item.product.title} is no longer available`);
    if (item.product.stock < item.quantity) throw new ApiError(400, `Not enough stock for ${item.product.title}`);
  }

  // build order items + calculate total----------------
  const items = cart.items.map((item) => ({
    product:         item.product._id,
    quantity:        item.quantity,
    priceAtPurchase: item.product.price,
  }));

  const totalAmount = items.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0);

  const order = await Order.create({
    user: req.user._id,
    items,
    totalAmount,
    shippingAddress,
    paymentMethod: paymentMethod || "cod",
  });

  // decrement stock + increment purchased analytics-------------
  await Promise.all(
    cart.items.map((item) =>
      Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity, "analytics.purchased": 1 },
      })
    )
  );

  // clear cart after order-----------------------
  await Cart.findOneAndDelete({ user: req.user._id });

  // emit socket.io notification to admin (attach io to req in app.js)
  if (req.io) {
    req.io.to("admin_room").emit("new_order", {
      orderId:  order._id,
      userName: req.user.fullname,
      total:    totalAmount,
    });
  }

  res.status(201).json(new ApiResponse(201, order, "Order placed successfully"));
});

// GET MY ORDERS (user)
export const getMyOrders = asynchandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate("items.product", "title images price")
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, orders, "Orders fetched successfully"));
});

// GET ALL ORDERS (admin)
export const getAllOrders = asynchandler(async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip  = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find()
      .populate("user", "fullname email username")
      .populate("items.product", "title price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(),
  ]);

  res.status(200).json(new ApiResponse(200, { orders, total, page }, "All orders fetched"));
});

// UPDATE ORDER STATUS (admin)
export const updateOrderStatus = asynchandler(async (req, res) => {
  const { status, paymentStatus } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");

  if (status)        order.status        = status;
  if (paymentStatus) {
    order.paymentStatus = paymentStatus;
    order.isPaid        = paymentStatus === "paid";
  }

  await order.save();
  res.status(200).json(new ApiResponse(200, order, "Order status updated"));
});

// DOWNLOAD ALL ORDERS AS CSV (admin)
export const downloadOrdersCSV = asynchandler(async (req, res) => {
  const orders = await Order.find()
    .populate("user", "fullname email")
    .populate("items.product", "title price");

  const data = orders.map((o) => ({
    orderId:       o._id,
    customerName:  o.user?.fullname,
    customerEmail: o.user?.email,
    total:         o.totalAmount,
    status:        o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    city:          o.shippingAddress?.city,
    country:       o.shippingAddress?.country,
    date:          o.createdAt,
  }));

  const parser = new Parser();
  const csv    = parser.parse(data);

  res.header("Content-Type", "text/csv");
  res.attachment("orders.csv");
  res.send(csv);
});