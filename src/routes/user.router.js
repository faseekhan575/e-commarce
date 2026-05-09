// ============================================================
// user.router.js
// ============================================================
import { Router } from "express";
import {
  getProfile,
  updateProfile,
  updateAvatar,
  changePassword,
  deleteAccount,
} from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const userRouter = Router();

userRouter.route("/profile").get(protect, getProfile);
userRouter.route("/profile/update").patch(protect, updateProfile);
userRouter.route("/avatar").patch(protect, upload.single("avatar"), updateAvatar);
userRouter.route("/password").patch(protect, changePassword);
userRouter.route("/delete").delete(protect, deleteAccount);

export default userRouter;