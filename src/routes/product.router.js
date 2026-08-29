import { Router } from "express";
import {
  createProduct,
  updateProduct,
  updateProductStock,
  toggleHotProduct,
  toggleSizeAvailability,
  updateSizeStock,
  deleteProduct,
  getAllProducts,
  getHotProducts,
  getTopSellingProducts,
  getAvailableFabrics,
  getAdminProducts,
  getLowStockProducts,
  getProductById,
  getProductAnalytics,
  addProductImage,
  deleteProductImage,
  setDefaultProductImage,
  setHoverProductImage,
  reorderProductImages,
} from "../controllers/product.controller.js";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const productRouter = Router();

// ============================================================
// PUBLIC ROUTES
// ============================================================

// GET ALL ACTIVE PRODUCTS (with search, category, price, isHot filters, pagination)
productRouter.route("/").get(getAllProducts);
productRouter.route("/all").get(getAllProducts);

// GET HOT & FEATURED PRODUCTS (for frontpage hero/showcase)
productRouter.route("/hot").get(getHotProducts);

// GET TOP SELLING APPAREL (with fabric filter tabs: Cambric, Luxury Lawn, Raw Silk, etc.)
productRouter.route("/top-selling").get(getTopSellingProducts);

// GET AVAILABLE FABRICS LIST (for filter pill navigation)
productRouter.route("/fabrics").get(getAvailableFabrics);


// ============================================================
// ADMIN ROUTES (Placed BEFORE /:productid to avoid route clash)
// ============================================================

// CREATE PRODUCT (Supports up to 10 images under 'image' or 'images')
productRouter
  .route("/create")
  .post(
    protect,
    isAdmin,
    upload.fields([
      { name: "image", maxCount: 10 },
      { name: "images", maxCount: 10 },
    ]),
    createProduct
  );

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

// UPDATE PRODUCT DETAILS (Can upload additional images up to 10)
productRouter
  .route("/:productid/update")
  .patch(
    protect,
    isAdmin,
    upload.fields([
      { name: "image", maxCount: 10 },
      { name: "images", maxCount: 10 },
    ]),
    updateProduct
  );

// QUICK STOCK UPDATE
productRouter
  .route("/:productid/stock")
  .patch(protect, isAdmin, updateProductStock);

// TOGGLE HOT / FEATURED STATUS
productRouter
  .route("/:productid/toggle-hot")
  .patch(protect, isAdmin, toggleHotProduct);

// 1-CLICK TOGGLE SIZE AVAILABILITY (ADMIN ONLY)
productRouter
  .route("/:productid/toggle-size")
  .patch(protect, isAdmin, toggleSizeAvailability);

// UPDATE SIZE SPECIFIC STOCK (ADMIN ONLY)
productRouter
  .route("/:productid/size-stock")
  .patch(protect, isAdmin, updateSizeStock);

// DELETE PRODUCT
productRouter
  .route("/:productid/delete")
  .delete(protect, isAdmin, deleteProduct);

// PRODUCT ANALYTICS
productRouter
  .route("/:productid/analytics")
  .get(protect, isAdmin, getProductAnalytics);

// ADD PRODUCT IMAGE(S) (Supports 1 to 10 images)
productRouter
  .route("/:productid/image/add")
  .post(
    protect,
    isAdmin,
    upload.fields([
      { name: "image", maxCount: 10 },
      { name: "images", maxCount: 10 },
    ]),
    addProductImage
  );


// SET DEFAULT COVER IMAGE (ADMIN ONLY)
productRouter
  .route("/:productid/image/set-default")
  .patch(protect, isAdmin, setDefaultProductImage);

// SET HOVER IMAGE (ADMIN ONLY)
productRouter
  .route("/:productid/image/set-hover")
  .patch(protect, isAdmin, setHoverProductImage);

// REORDER PRODUCT IMAGES (ADMIN ONLY)
productRouter
  .route("/:productid/image/reorder")
  .patch(protect, isAdmin, reorderProductImages);

// DELETE PRODUCT IMAGE
productRouter
  .route("/:productid/image/delete")
  .delete(protect, isAdmin, deleteProductImage);

export default productRouter;

