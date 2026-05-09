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
import { protect, isAdmin } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const productRouter = Router();

productRouter.route("/").get(getAllProducts);
productRouter.route("/create").post(protect, isAdmin, upload.array("image", 5), createProduct)
productRouter.route("/:productid").get(getProductById);
productRouter.route("/:productid/update").patch(protect, isAdmin, upload.array("image", 5), updateProduct)
productRouter.route("/:productid/delete").delete(protect, isAdmin, deleteProduct);
productRouter.route("/:productid/analytics").get(protect, isAdmin, getProductAnalytics);
productRouter.route("/:productid/image/add").post(protect, isAdmin, upload.single("image"), addProductImage);
productRouter.route("/:productid/image/delete").delete(protect, isAdmin, deleteProductImage);

export default productRouter;