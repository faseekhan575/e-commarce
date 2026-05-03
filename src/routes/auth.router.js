import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";

import { register } from "../controllers/auth.contollers.js";
import { verifyOTP } from "../controllers/auth.contollers.js";
import { login } from "../controllers/auth.contollers.js";

const authrouter = Router();


authrouter.route("/register").post(register)
authrouter.route("/verifyopt").post(verifyOTP)
authrouter.route("/login").post(login)




export default authrouter;