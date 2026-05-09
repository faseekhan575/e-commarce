// ============================================================
// category.router.js
// ============================================================
import { Router } from "express";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const categoryRouter = Router();

categoryRouter.route("/").get(getAllCategories);
categoryRouter.route("/create").post(protect, isAdmin, upload.single("image"), createCategory);
categoryRouter.route("/:categoryid/update").patch(protect, isAdmin, upload.single("image"), updateCategory);
categoryRouter.route("/:categoryid/delete").delete(protect, isAdmin, deleteCategory);

export default categoryRouter;