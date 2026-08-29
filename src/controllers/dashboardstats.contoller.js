// ============================================================
// dashboardstats.contoller.js
// ============================================================

import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Order } from "../models/orders.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.models.js";
import { Category } from "../models/Category.model.js";

// ─── FULL DASHBOARD & REVENUE STATS (ADMIN) ──────────────────
export const getDashboardStats = asynchandler(async (req, res) => {
  const now = new Date();

  // Date boundaries
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    // users
    totalUsers,
    newUsersThisMonth,
    newUsersToday,

    // orders counts
    totalOrders,
    ordersToday,
    ordersThisMonth,
    pendingOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,

    // payment breakdown
    unpaidOrders,
    paidOrders,
    refundedOrders,

    // revenue & profit aggregations
    totalRevenueData,
    revenueTodayData,
    revenueThisMonthData,
    revenueLastMonthData,

    // inventory & products valuation
    totalProducts,
    activeProducts,
    outOfStockProducts,
    lowStockProducts,
    inventoryValuationData,

    // recent 10 orders
    recentOrders,

    // top 5 selling products
    topProducts,

    // orders, revenue & profit per day this month (for chart)
    ordersPerDay,

    // revenue & profit by category
    categoryRevenueData,
  ] = await Promise.all([
    // Users
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "user", createdAt: { $gte: thisMonth } }),
    User.countDocuments({ role: "user", createdAt: { $gte: startOfToday } }),

    // Orders counts
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: startOfToday } }),
    Order.countDocuments({ createdAt: { $gte: thisMonth } }),
    Order.countDocuments({ status: "pending" }),
    Order.countDocuments({ status: "processing" }),
    Order.countDocuments({ status: "shipped" }),
    Order.countDocuments({ status: "delivered" }),
    Order.countDocuments({ status: "cancelled" }),

    // Payment breakdown
    Order.countDocuments({ paymentStatus: "unpaid" }),
    Order.countDocuments({ paymentStatus: "paid" }),
    Order.countDocuments({ paymentStatus: "refunded" }),

    // Revenue & Profit
    Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalProfit: { $sum: "$totalProfit" },
        },
      },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: startOfToday } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalProfit: { $sum: "$totalProfit" },
        },
      },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: thisMonth } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalProfit: { $sum: "$totalProfit" },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: lastMonth, $lt: thisMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalProfit: { $sum: "$totalProfit" },
        },
      },
    ]),

    // Products & Inventory Valuation
    Product.countDocuments(),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ stock: { $lte: 0 } }),
    Product.countDocuments({ stock: { $gt: 0, $lte: 5 } }),
    Product.aggregate([
      {
        $group: {
          _id: null,
          totalUnits: { $sum: "$stock" },
          retailValue: { $sum: { $multiply: ["$price", "$stock"] } },
          costValue: {
            $sum: { $multiply: [{ $ifNull: ["$costPrice", 0] }, "$stock"] },
          },
        },
      },
    ]),

    // Recent 10 orders
    Order.find()
      .populate("user", "fullname email username avatar")
      .populate("items.product", "title images price costPrice sku")
      .sort({ createdAt: -1 })
      .limit(10),

    // Top 5 selling products
    Product.find()
      .populate("category", "name slug")
      .select("title images price costPrice discountPrice stock analytics isActive sku")
      .sort({ "analytics.purchased": -1, "analytics.views": -1 })
      .limit(5),

    // Daily chart aggregation for current month
    Order.aggregate([
      { $match: { createdAt: { $gte: thisMonth } } },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          orders: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0],
            },
          },
          profit: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalProfit", 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Revenue & Profit by category aggregation
    Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productDoc",
        },
      },
      { $unwind: "$productDoc" },
      {
        $lookup: {
          from: "categories",
          localField: "productDoc.category",
          foreignField: "_id",
          as: "categoryDoc",
        },
      },
      { $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$categoryDoc.name",
          totalRevenue: {
            $sum: { $multiply: ["$items.priceAtPurchase", "$items.quantity"] },
          },
          totalProfit: {
            $sum: { $ifNull: ["$items.itemProfit", 0] },
          },
          itemsSold: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]),
  ]);

  // Revenue & Profit calculations
  const totalRevenue = totalRevenueData[0]?.totalRevenue || 0;
  const totalProfit = totalRevenueData[0]?.totalProfit || 0;
  const revenueToday = revenueTodayData[0]?.totalRevenue || 0;
  const profitToday = revenueTodayData[0]?.totalProfit || 0;
  const revenueThisMonth = revenueThisMonthData[0]?.totalRevenue || 0;
  const profitThisMonth = revenueThisMonthData[0]?.totalProfit || 0;
  const revenueLastMonth = revenueLastMonthData[0]?.totalRevenue || 0;
  const profitLastMonth = revenueLastMonthData[0]?.totalProfit || 0;

  const profitMarginPercent =
    totalRevenue > 0
      ? ((totalProfit / totalRevenue) * 100).toFixed(1) + "%"
      : "0.0%";

  const revenueGrowth =
    revenueLastMonth === 0
      ? revenueThisMonth > 0
        ? 100
        : 0
      : Number(
          (
            ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) *
            100
          ).toFixed(1)
        );

  const inventoryUnits = inventoryValuationData[0]?.totalUnits || 0;
  const inventoryRetailValue = inventoryValuationData[0]?.retailValue || 0;
  const inventoryCostValue = inventoryValuationData[0]?.costValue || 0;
  const potentialInventoryProfit =
    inventoryRetailValue - inventoryCostValue;

  const averageOrderValue =
    totalOrders > 0 ? (totalRevenue / (paidOrders || 1)).toFixed(2) : "0.00";

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        // ── Financial Overview Cards ──
        overview: {
          totalRevenue,
          totalProfit,
          profitMargin: profitMarginPercent,
          revenueToday,
          profitToday,
          revenueThisMonth,
          profitThisMonth,
          revenueLastMonth,
          profitLastMonth,
          revenueGrowth: `${revenueGrowth}%`,
          averageOrderValue: `$${averageOrderValue}`,

          totalOrders,
          ordersToday,
          ordersThisMonth,

          totalUsers,
          newUsersToday,
          newUsersThisMonth,

          // ── Inventory Valuation ──
          totalProducts,
          activeProducts,
          outOfStockProducts,
          lowStockProducts,
          inventoryUnits,
          inventoryCostValue, // Capital invested in current stock
          inventoryRetailValue, // Total retail selling potential
          potentialInventoryProfit, // Remaining profit in warehouse
        },

        // ── Order Status Breakdown ──
        orderStatus: {
          pending: pendingOrders,
          processing: processingOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },

        // ── Payment Status Breakdown ──
        paymentStatus: {
          paid: paidOrders,
          unpaid: unpaidOrders,
          refunded: refundedOrders,
        },

        // ── Recent Orders ──
        recentOrders,

        // ── Top Selling Products ──
        topProducts,

        // ── Category Revenue & Profit Breakdown ──
        categoryRevenue: categoryRevenueData.map((c) => ({
          category: c._id || "Uncategorized",
          revenue: c.totalRevenue,
          profit: c.totalProfit,
          itemsSold: c.itemsSold,
        })),

        // ── Chart Data (day-by-day revenue & profit this month) ──
        chartData: ordersPerDay.map((d) => ({
          day: d._id,
          orders: d.orders,
          revenue: d.revenue,
          profit: d.profit,
        })),
      },
      "Dashboard stats and financial analytics fetched successfully"
    )
  );
});


// ─── LIVE ORDERS (pending + processing only) ─────────────────
export const getLiveOrders = asynchandler(async (req, res) => {
  const liveOrders = await Order.find({
    status: { $in: ["pending", "processing"] },
  })
    .populate("user", "fullname email username avatar")
    .populate("items.product", "title images price")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(200, liveOrders, "Live orders fetched successfully")
    );
});

// ─── ORDERS MONTHLY BREAKDOWN ────────────────────────────────
export const getMonthlyOrders = asynchandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const orders = await Order.find({
    createdAt: { $gte: startDate, $lt: endDate },
  })
    .populate("user", "fullname email username")
    .populate("items.product", "title price")
    .sort({ createdAt: -1 });

  const totalRevenue = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        totalOrders: orders.length,
        totalRevenue,
        deliveredCount,
        pendingCount,
        month,
        year,
      },
      "Monthly orders fetched successfully"
    )
  );
});

// ─── SINGLE ORDER DETAIL (ADMIN) ─────────────────────────────
export const getOrderDetail = asynchandler(async (req, res) => {
  const { orderid } = req.params;

  const order = await Order.findById(orderid)
    .populate("user", "fullname email username avatar createdAt")
    .populate("items.product", "title images price discountPrice stock category");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order detail fetched successfully"));
});

// ─── INVENTORY SUMMARY (ADMIN) ───────────────────────────────
export const getInventorySummary = asynchandler(async (req, res) => {
  const [outOfStock, lowStock, totalCount] = await Promise.all([
    Product.countDocuments({ stock: { $lte: 0 } }),
    Product.countDocuments({ stock: { $gt: 0, $lte: 5 } }),
    Product.countDocuments(),
  ]);

  const categories = await Category.find().select("name slug");
  const categoryStats = await Product.aggregate([
    {
      $group: {
        _id: "$category",
        productCount: { $sum: 1 },
        totalStock: { $sum: "$stock" },
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalCount,
        outOfStock,
        lowStock,
        inStock: totalCount - outOfStock,
        categoryStats,
      },
      "Inventory summary fetched successfully"
    )
  );
});