// ============================================================
// product.router.js
// ============================================================

import { Router } from "express";

import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  getProductAnalytics,
  addProductImage,
  deleteProductImage,
} from "../controllers/product.controller.js";

import {
  protect,
  isAdmin,
} from "../middlewares/auth.middleware.js";

import {
  upload,
} from "../middlewares/multer.middleware.js";

const productRouter = Router();

// ============================================================
// PUBLIC ROUTES
// ============================================================

// GET ALL PRODUCTS
productRouter
  .route("/")
  .get(getAllProducts);

// GET SINGLE PRODUCT
productRouter
  .route("/:productid")
  .get(getProductById);

// ============================================================
// ADMIN ROUTES
// ============================================================

// CREATE PRODUCT
productRouter
  .route("/create")
  .post(
    protect,
    isAdmin,
    upload.array("image", 5),
    createProduct
  );

// UPDATE PRODUCT
productRouter
  .route("/:productid/update")
  .patch(
    protect,
    isAdmin,
    upload.array("image", 5),
    updateProduct
  );

// DELETE PRODUCT
productRouter
  .route("/:productid/delete")
  .delete(
    protect,
    isAdmin,
    deleteProduct
  );

// PRODUCT ANALYTICS
productRouter
  .route("/:productid/analytics")
  .get(
    protect,
    isAdmin,
    getProductAnalytics
  );

// ADD PRODUCT IMAGE
productRouter
  .route("/:productid/image/add")
  .post(
    protect,
    isAdmin,
    upload.single("image"),
    addProductImage
  );

// DELETE PRODUCT IMAGE
productRouter
  .route("/:productid/image/delete")
  .delete(
    protect,
    isAdmin,
    deleteProductImage
  );

export default productRouter;