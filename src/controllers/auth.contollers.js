import { asynchandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import nodemailer from "nodemailer";

// ─── helper: generate 6 digit OTP ───────────────────────────────────────────
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ─── helper: send OTP email ──────────────────────────────────────────────────
const sendOTPEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // gmail app password not your real password
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    html: `
      <h2>Your OTP Code</h2>
      <p>Use this code to verify your account:</p>
      <h1>${otp}</h1>
      <p>This code expires in 10 minutes.</p>
    `,
  });
};


// ─── helper: issue tokens and set cookies ───────────────────────────────────
const issueTokens = async (user, res) => {
  const accessToken  = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.tokens.push(refreshToken);
  await user.save({ validateBeforeSave: false });

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none",  // ← required for Netlify + Render cross-origin
  };

  res
    .cookie("accessToken", accessToken, cookieOptions)   // ← add options
    .cookie("refreshToken", refreshToken, cookieOptions); // ← add options

  return { accessToken, refreshToken };
};


// ─── REGISTER ────────────────────────────────────────────────────────────────
// POST /api/auth/register

export const register = asynchandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;

  if (!username || !email || !fullname || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new ApiError(409, "User with this email or username already exists");
  }

  const otp       = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const user = await User.create({
    username,
    email,
    fullname,
    password,
    otp,
    otpExpiry,
    isVerified: false,
  });

  await sendOTPEmail(email, otp);

  res.status(201).json(
    new ApiResponse(201, {}, "OTP sent to your email. Please verify to activate your account")
  );
});

// ─── VERIFY OTP (first time) ─────────────────────────────────────────────────
// POST /api/auth/verify-otp

export const verifyOTP = asynchandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isVerified) {
    throw new ApiError(400, "User already verified");
  }

  if (user.otp !== otp) {
    throw new ApiError(400, "Invalid OTP");
  }

  if (user.otpExpiry < new Date()) {
    throw new ApiError(400, "OTP has expired. Please request a new one");
  }

  // clear otp and activate account
  user.isVerified = true;
  user.otp        = null;
  user.otpExpiry  = null;
  await user.save({ validateBeforeSave: false });

  const { accessToken, refreshToken } = await issueTokens(user, res);

  res.status(200).json(
    new ApiResponse(200, { accessToken, refreshToken, role: user.role }, "Account verified and logged in successfully")
  );
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────
// POST /api/auth/login

export const login = asynchandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.isVerified) {
    throw new ApiError(403, "Please verify your email first");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await issueTokens(user, res);

 res.status(200).json(
    new ApiResponse(200, {
      _id:          user._id,        // ✅ added
      accessToken,
      refreshToken,
      role:         user.role,
      email:        user.email,      // ✅ useful for frontend display
      username:     user.username,   // ✅ useful for frontend display
      fullname:     user.fullname,   // ✅ useful for frontend display
      avatar:       user.avatar,     // ✅ useful for navbar profile pic
    }, "Logged in successfully")
  );

});

// ─── FORGOT PASSWORD: send OTP ───────────────────────────────────────────────
// POST /api/auth/forgot-password

export const forgotPassword = asynchandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const otp       = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  user.otp       = otp;
  user.otpExpiry = otpExpiry;
  await user.save({ validateBeforeSave: false });

  await sendOTPEmail(email, otp);

  res.status(200).json(
    new ApiResponse(200, {}, "OTP sent to your email for password reset")
  );
});

// ─── VERIFY OTP FOR RESET PASSWORD ──────────────────────────────────────────
// POST /api/auth/verify-reset-otp

export const verifyResetOTP = asynchandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.otp !== otp) {
    throw new ApiError(400, "Invalid OTP");
  }

  if (user.otpExpiry < new Date()) {
    throw new ApiError(400, "OTP has expired. Please request a new one.");
  }

  // clear otp — frontend now shows reset password form
  user.otp       = null;
  user.otpExpiry = null;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(200, {}, "OTP verified. You can now reset your password.")
  );
});

// ─── RESET PASSWORD ────────────────────────────────────────────
// POST /api/auth/reset-password
export const resetPassword = asynchandler(async (req, res) => {
  const { email, otp, newPassword } = req.body; // 👈 add otp here

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  // verify otp here instead of separate endpoint
  if (user.otp !== otp) throw new ApiError(400, "Invalid OTP");
  if (user.otpExpiry < new Date()) throw new ApiError(400, "OTP expired");

  // clear otp + set new password
  user.otp = null;
  user.otpExpiry = null;
  user.password = newPassword;
  await user.save();

  res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"));
});

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
// POST /api/auth/logout

export const logout = asynchandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { tokens: token },
  });

  const cookieOptions = { httpOnly: true, secure: true, sameSite: "none" };

  res
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .status(200)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});