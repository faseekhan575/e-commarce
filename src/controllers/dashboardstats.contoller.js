import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Order } from "../models/orders.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.models.js";

// ─── FULL DASHBOARD STATS ────────────────────────────────────
export const getDashboardStats = asynchandler(async (req, res) => {

  const now       = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);      // start of this month
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);  // start of last month

  const [
    // users
    totalUsers,
    newUsersThisMonth,

    // orders
    totalOrders,
    pendingOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    ordersThisMonth,

    // revenue
    totalRevenueData,
    revenueThisMonthData,
    revenueLastMonthData,

    // products
    totalProducts,
    outOfStockProducts,

    // recent orders
    recentOrders,

    // top selling products
    topProducts,

    // orders per day this month (for chart)
    ordersPerDay,

  ] = await Promise.all([

    // ── users ──
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "user", createdAt: { $gte: thisMonth } }),

    // ── orders ──
    Order.countDocuments(),
    Order.countDocuments({ status: "pending" }),
    Order.countDocuments({ status: "processing" }),
    Order.countDocuments({ status: "shipped" }),
    Order.countDocuments({ status: "delivered" }),
    Order.countDocuments({ status: "cancelled" }),
    Order.countDocuments({ createdAt: { $gte: thisMonth } }),

    // ── revenue ──
    Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: lastMonth, $lt: thisMonth } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),

    // ── products ──
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ stock: 0, isActive: true }),

    // ── recent 10 orders ──
    Order.find()
      .populate("user", "fullname email avatar")
      .populate("items.product", "title images price")
      .sort({ createdAt: -1 })
      .limit(10),

    // ── top 5 selling products ──
    Product.find({ isActive: true })
      .select("title images price analytics stock")
      .sort({ "analytics.purchased": -1 })
      .limit(5),

    // ── orders per day this month (for chart) ──
    Order.aggregate([
      { $match: { createdAt: { $gte: thisMonth } } },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          orders:  { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  // ── revenue comparison ──
  const totalRevenue         = totalRevenueData[0]?.total        || 0;
  const revenueThisMonth     = revenueThisMonthData[0]?.total    || 0;
  const revenueLastMonth     = revenueLastMonthData[0]?.total    || 0;

  // revenue growth % compared to last month
  const revenueGrowth = revenueLastMonth === 0
    ? 100
    : (((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1);

  return res.status(200).json(
    new ApiResponse(200, {

      // ── overview cards ──
      overview: {
        totalUsers,
        newUsersThisMonth,
        totalOrders,
        ordersThisMonth,
        totalRevenue,
        revenueThisMonth,
        revenueLastMonth,
        revenueGrowth:    `${revenueGrowth}%`,
        totalProducts,
        outOfStockProducts,
      },

      // ── order status breakdown ──
      orderStatus: {
        pending:    pendingOrders,
        processing: processingOrders,
        shipped:    shippedOrders,
        delivered:  deliveredOrders,
        cancelled:  cancelledOrders,
      },

      // ── recent orders table ──
      recentOrders,

      // ── top selling products ──
      topProducts,

      // ── chart data (orders + revenue per day) ──
      chartData: ordersPerDay.map((d) => ({
        day:     d._id,
        orders:  d.orders,
        revenue: d.revenue,
      })),

    }, "Dashboard stats fetched successfully")
  );
});

// ─── LIVE ORDERS (pending + processing only) ─────────────────
// admin sees these in real time as they come in via socket.io
export const getLiveOrders = asynchandler(async (req, res) => {
  const liveOrders = await Order.find({
    status: { $in: ["pending", "processing"] },
  })
    .populate("user", "fullname email avatar")
    .populate("items.product", "title images price")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, liveOrders, "Live orders fetched successfully")
  );
});

// ─── ORDERS THIS MONTH BREAKDOWN ─────────────────────────────
export const getMonthlyOrders = asynchandler(async (req, res) => {
  const year  = parseInt(req.query.year)  || new Date().getFullYear();
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;

  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 1);

  const orders = await Order.find({
    createdAt: { $gte: startDate, $lt: endDate },
  })
    .populate("user", "fullname email")
    .populate("items.product", "title price")
    .sort({ createdAt: -1 });

  const totalRevenue = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return res.status(200).json(
    new ApiResponse(200, {
      orders,
      totalOrders:  orders.length,
      totalRevenue,
      month,
      year,
    }, "Monthly orders fetched successfully")
  );
});

// ─── SINGLE ORDER DETAIL (admin) ─────────────────────────────
export const getOrderDetail = asynchandler(async (req, res) => {
  const order = await Order.findById(req.params.orderid)
    .populate("user", "fullname email username avatar")
    .populate("items.product", "title images price discountPrice");

  if (!order) throw new ApiError(404, "Order not found");

  return res.status(200).json(
    new ApiResponse(200, order, "Order detail fetched successfully")
  );
});