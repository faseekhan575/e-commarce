// ===========================================================
// order.controller.js
// ===========================================================

import mongoose from "mongoose";
import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import { Order } from "../models/orders.model.js";
import { Product } from "../models/product.model.js";
import { Cart } from "../models/cart.model.js";
import { getIO } from "../socket.js";
import { Parser } from "json2csv";
import { sendOrderConfirmationEmail, sendOrderDispatchedEmail } from "../utils/mailer.js";


// ===========================================================
// PLACE ORDER (CUSTOMER)
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
    throw new ApiError(400, "Your cart is empty");
  }

  // Validate products + stock
  for (const item of cart.items) {
    if (!item.product) {
      throw new ApiError(404, "One or more products in your cart no longer exist");
    }

    if (!item.product.isActive) {
      throw new ApiError(
        400,
        `'${item.product.title}' is currently unavailable`
      );
    }

    if (item.product.stock < item.quantity) {
      throw new ApiError(
        400,
        `Not enough stock for '${item.product.title}'. Only ${item.product.stock} left in stock.`
      );
    }
  }

  // Build order items (snapshot current price, cost price, item profit, size, and color)
  let totalOrderProfit = 0;
  const items = cart.items.map((item) => {
    const salePrice = item.product.discountPrice || item.product.price;
    const costPrice = item.product.costPrice || 0;
    const lineProfit = Math.max(0, salePrice - costPrice) * item.quantity;
    totalOrderProfit += lineProfit;

    return {
      product: item.product._id,
      quantity: item.quantity,
      size: item.size || "M",
      color: item.color || "",
      priceAtPurchase: salePrice,
      costPriceAtPurchase: costPrice,
      itemProfit: lineProfit,
    };
  });

  // Calculate total
  const totalAmount = items.reduce(
    (acc, item) => acc + item.priceAtPurchase * item.quantity,
    0
  );

  // Create order with profit accounting and tracking timeline
  const order = await Order.create({
    user: req.user._id,
    items,
    totalAmount,
    totalProfit: totalOrderProfit,
    shippingAddress,
    paymentMethod: paymentMethod || "cod",
    paymentStatus: "unpaid",
    status: "pending",
    timeline: [
      {
        status: "pending",
        note: "Order placed successfully by customer",
        timestamp: new Date(),
      },
    ],
  });


  // Deduct stock and increment purchase analytics
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
  await Cart.findOneAndDelete({ user: req.user._id });

  // Real-time socket notification to admin
  try {
    const io = getIO();
    if (io) {
      io.to("admin_room").emit("new_order", {
        orderId: order._id,
        totalAmount,
        customerName: req.user.fullname,
        customerEmail: req.user.email,
        itemsCount: items.length,
        createdAt: order.createdAt,
      });
    }
  } catch (socketErr) {
    console.error("Socket emit error:", socketErr.message);
  }


  const populatedOrder = await Order.findById(order._id)
    .populate("items.product", "title images price")
    .populate("user", "fullname email");

  return res
    .status(201)
    .json(new ApiResponse(201, populatedOrder, "Order placed successfully"));
});

// ===========================================================
// GET MY ORDERS (CUSTOMER)
// ===========================================================
export const getMyOrders = asynchandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  const [orders, totalOrders] = await Promise.all([
    Order.find({ user: req.user._id })
      .populate("items.product", "title images price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments({ user: req.user._id }),
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
      "Orders fetched successfully"
    )
  );
});

// ===========================================================
// GET SINGLE ORDER DETAIL (CUSTOMER / ADMIN)
// ===========================================================
export const getOrderById = asynchandler(async (req, res) => {
  const { orderid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(orderid)) {
    throw new ApiError(400, "Invalid order ID format");
  }

  const order = await Order.findById(orderid)
    .populate("user", "fullname email username avatar")
    .populate("items.product", "title images price discountPrice");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // If normal user, make sure they own this order
  if (
    req.user.role !== "admin" &&
    order.user._id.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, "Access denied. You can only view your own orders");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order detail fetched successfully"));
});

// ===========================================================
// CANCEL ORDER (CUSTOMER - only if pending)
// ===========================================================
export const cancelMyOrder = asynchandler(async (req, res) => {
  const { orderid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(orderid)) {
    throw new ApiError(400, "Invalid order ID format");
  }

  const order = await Order.findById(orderid);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only cancel your own orders");
  }

  if (order.status !== "pending") {
    throw new ApiError(
      400,
      `Cannot cancel order with status '${order.status}'. Please contact customer support.`
    );
  }

  order.status = "cancelled";
  await order.save();

  // Restore inventory stock
  await Promise.all(
    order.items.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: {
          stock: item.quantity,
          "analytics.purchased": -item.quantity,
        },
      })
    )
  );

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order cancelled and stock restored"));
});

// ===========================================================
// GET ALL ORDERS (ADMIN ONLY - with search & filters)
// ===========================================================
export const getAllOrders = asynchandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 15);
  const skip = (page - 1) * limit;

  const { status, paymentStatus, paymentMethod, search } = req.query;

  const query = {};

  if (status) {
    query.status = status;
  }

  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  if (paymentMethod) {
    query.paymentMethod = paymentMethod;
  }

  if (search) {
    if (mongoose.Types.ObjectId.isValid(search)) {
      query._id = search;
    }
  }

  const [orders, totalOrders] = await Promise.all([
    Order.find(query)
      .populate("user", "fullname email username avatar")
      .populate("items.product", "title price images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(query),
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
// UPDATE ORDER STATUS & PAYMENT (ADMIN ONLY)
// ===========================================================
export const updateOrderStatus = asynchandler(async (req, res) => {
  const { orderid } = req.params;
  const { status, paymentStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(orderid)) {
    throw new ApiError(400, "Invalid order ID format");
  }

  const order = await Order.findById(orderid);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const previousStatus = order.status;

  // Update status
  if (status) {
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }
    order.status = status;

    if (status === "delivered") {
      order.deliveredAt = new Date();
    }

    // Append to timeline
    order.timeline.push({
      status: order.status,
      note: `Order status changed to '${order.status}' by Admin`,
      timestamp: new Date(),
    });

    // If order was cancelled now by admin, restore stock
    if (status === "cancelled" && previousStatus !== "cancelled") {
      await Promise.all(
        order.items.map((item) =>
          Product.findByIdAndUpdate(item.product, {
            $inc: {
              stock: item.quantity,
              "analytics.purchased": -item.quantity,
            },
          })
        )
      );
    }
  }

  // Update payment status
  if (paymentStatus) {
    const validPaymentStatuses = ["unpaid", "paid", "refunded"];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      throw new ApiError(
        400,
        `Invalid payment status. Must be one of: ${validPaymentStatuses.join(", ")}`
      );
    }
    order.paymentStatus = paymentStatus;
    order.isPaid = paymentStatus === "paid";
    if (paymentStatus === "paid" && !order.paidAt) {
      order.paidAt = new Date();
    }
    order.timeline.push({
      status: order.status,
      note: `Payment status marked as '${paymentStatus}'`,
      timestamp: new Date(),
    });
  }

  await order.save();

  const updatedOrder = await Order.findById(order._id)
    .populate("user", "fullname email")
    .populate("items.product", "title price images sku");

  // Real-time socket notification to customer and admin
  try {
    const io = getIO();
    if (io) {
      // Alert customer room
      io.to(`user_${order.user}`).emit("order_status_updated", {
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        timeline: order.timeline,
        updatedAt: order.updatedAt,
      });

      // Alert admin room
      io.to("admin_room").emit("admin_order_updated", {
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        customerName: updatedOrder?.user?.fullname,
      });
    }
  } catch (socketErr) {
    console.error("Socket emit error:", socketErr.message);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedOrder,
        "Order status updated successfully"
      )
    );
});

// ===========================================================
// UPDATE ORDER TRACKING & COURIER DISPATCH (ADMIN ONLY)
// ===========================================================
export const updateOrderTracking = asynchandler(async (req, res) => {
  const { orderid } = req.params;
  const { trackingNumber, courier, trackingUrl, estimatedDelivery, note } =
    req.body;

  if (!mongoose.Types.ObjectId.isValid(orderid)) {
    throw new ApiError(400, "Invalid order ID format");
  }

  const order = await Order.findById(orderid);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber.trim();
  if (courier !== undefined) order.courier = courier.trim();
  if (trackingUrl !== undefined) order.trackingUrl = trackingUrl.trim();
  if (estimatedDelivery !== undefined) {
    order.estimatedDelivery = new Date(estimatedDelivery);
  }

  // If order was pending, advance to shipped when courier tracking is provided
  if (trackingNumber && order.status === "pending") {
    order.status = "shipped";
  }

  const trackingNote =
    note ||
    `Courier tracking updated: ${order.courier || "Courier"} (Tracking #${order.trackingNumber || "N/A"})`;

  order.timeline.push({
    status: order.status,
    note: trackingNote,
    timestamp: new Date(),
  });

  await order.save();

  const updatedOrder = await Order.findById(order._id)
    .populate("user", "fullname email username avatar")
    .populate("items.product", "title price images sku");

  // Real-time socket notification
  try {
    const io = getIO();
    if (io) {
      io.to(`user_${order.user}`).emit("order_status_updated", {
        orderId: order._id,
        status: order.status,
        trackingNumber: order.trackingNumber,
        courier: order.courier,
        trackingUrl: order.trackingUrl,
        timeline: order.timeline,
        updatedAt: order.updatedAt,
      });

      io.to("admin_room").emit("admin_order_updated", {
        orderId: order._id,
        status: order.status,
        trackingNumber: order.trackingNumber,
        customerName: updatedOrder?.user?.fullname,
      });
    }
  } catch (socketErr) {
    console.error("Socket emit error:", socketErr.message);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      updatedOrder,
      "Order tracking details updated successfully"
    )
  );
});

// ===========================================================
// DOWNLOAD ORDERS CSV (ADMIN ONLY)
// ===========================================================
export const downloadOrdersCSV = asynchandler(async (req, res) => {
  const orders = await Order.find()
    .populate("user", "fullname email")
    .populate("items.product", "title price")
    .sort({ createdAt: -1 });

  const formattedOrders = orders.map((order) => ({
    orderId: order._id.toString(),
    customerName: order.user?.fullname || "Guest",
    customerEmail: order.user?.email || "N/A",
    itemsCount: order.items?.length || 0,
    totalAmount: order.totalAmount,
    totalProfit: order.totalProfit || 0,
    orderStatus: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    courier: order.courier || "N/A",
    trackingNumber: order.trackingNumber || "N/A",
    street: order.shippingAddress?.street || "N/A",
    city: order.shippingAddress?.city || "N/A",
    country: order.shippingAddress?.country || "N/A",
    zip: order.shippingAddress?.zip || "N/A",
    createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : "N/A",
  }));

  const parser = new Parser();
  const csv = parser.parse(formattedOrders);

  res.header("Content-Type", "text/csv");
  res.attachment("orders.csv");
  return res.send(csv);
});
