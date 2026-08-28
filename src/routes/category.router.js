// ============================================================
// category.router.js
// ============================================================

import { Router } from "express";
import {
  getAllCategories,
  getHotCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  toggleHotCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const categoryRouter = Router();

// ============================================================
// PUBLIC ROUTES
// ============================================================

// Get all categories (with product counts & isHot query)
categoryRouter.route("/").get(getAllCategories);

// Get hot / featured categories for homepage carousel
categoryRouter.route("/hot").get(getHotCategories);

// ============================================================
// ADMIN ROUTES (BEFORE /:categoryid)
// ============================================================
categoryRouter
  .route("/create")
  .post(protect, isAdmin, upload.single("image"), createCategory);

// ============================================================
// PARAM ROUTES
// ============================================================
categoryRouter.route("/:categoryid").get(getCategoryById);

categoryRouter
  .route("/:categoryid/update")
  .patch(protect, isAdmin, upload.single("image"), updateCategory);

categoryRouter
  .route("/:categoryid/toggle-hot")
  .patch(protect, isAdmin, toggleHotCategory);

categoryRouter
  .route("/:categoryid/delete")
  .delete(protect, isAdmin, deleteCategory);

export default categoryRouter;
