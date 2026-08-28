// ============================================================
// product.router.js
// ============================================================

import { Router } from "express";
import {
  createProduct,
  updateProduct,
  updateProductStock,
  toggleHotProduct,
  deleteProduct,
  getAllProducts,
  getHotProducts,
  getAdminProducts,
  getLowStockProducts,
  getProductById,
  getProductAnalytics,
  addProductImage,
  deleteProductImage,
} from "../controllers/product.controller.js";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const productRouter = Router();

// ============================================================
// PUBLIC ROUTES
// ============================================================

// GET ALL ACTIVE PRODUCTS (with search, category, price, isHot filters, pagination)
productRouter.route("/").get(getAllProducts);

// GET HOT & FEATURED PRODUCTS (for frontpage hero/showcase)
productRouter.route("/hot").get(getHotProducts);

// ============================================================
// ADMIN ROUTES (Placed BEFORE /:productid to avoid route clash)
// ============================================================

// CREATE PRODUCT
productRouter
  .route("/create")
  .post(protect, isAdmin, upload.array("image", 5), createProduct);

// GET ALL PRODUCTS FOR ADMIN (full inventory, inactive, hot flags, stock status)
productRouter.route("/admin/all").get(protect, isAdmin, getAdminProducts);

// GET LOW-STOCK & OUT-OF-STOCK ALERTS
productRouter
  .route("/admin/low-stock")
  .get(protect, isAdmin, getLowStockProducts);

// ============================================================
// PARAM ROUTES (Placed AFTER all static admin routes)
// ============================================================

// GET SINGLE PRODUCT (public / admin)
productRouter.route("/:productid").get(getProductById);

// UPDATE PRODUCT DETAILS
productRouter
  .route("/:productid/update")
  .patch(protect, isAdmin, upload.array("image", 5), updateProduct);

// QUICK STOCK UPDATE
productRouter
  .route("/:productid/stock")
  .patch(protect, isAdmin, updateProductStock);

// TOGGLE HOT / FEATURED STATUS
productRouter
  .route("/:productid/toggle-hot")
  .patch(protect, isAdmin, toggleHotProduct);

// DELETE PRODUCT
productRouter
  .route("/:productid/delete")
  .delete(protect, isAdmin, deleteProduct);

// PRODUCT ANALYTICS
productRouter
  .route("/:productid/analytics")
  .get(protect, isAdmin, getProductAnalytics);

// ADD PRODUCT IMAGE
productRouter
  .route("/:productid/image/add")
  .post(protect, isAdmin, upload.single("image"), addProductImage);

// DELETE PRODUCT IMAGE
productRouter
  .route("/:productid/image/delete")
  .delete(protect, isAdmin, deleteProductImage);

export default productRouter;
