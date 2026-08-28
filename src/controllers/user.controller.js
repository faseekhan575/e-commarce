// ============================================================
// user.controller.js
// ============================================================

import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import uploadImage, { deleteImage } from "../utils/cloudinary.js";

// GET MY PROFILE
export const getProfile = asynchandler(async (req, res) => {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");

  const user = await User.findById(req.user._id).select("-password -tokens -otp -otpExpiry");
  if (!user) throw new ApiError(404, "User not found");
  res.status(200).json(new ApiResponse(200, user, "Profile fetched successfully"));
});

// UPDATE PROFILE (name, username, email)
export const updateProfile = asynchandler(async (req, res) => {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");

  const { username, email, fullname } = req.body;
  if (!username && !email && !fullname)
    throw new ApiError(400, "Provide at least one field to update");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        ...(username && { username }),
        ...(email && { email }),
        ...(fullname && { fullname }),
      },
    },
    { new: true }
  ).select("-password -tokens -otp -otpExpiry");

  if (!user) throw new ApiError(404, "User not found");

  res.status(200).json(new ApiResponse(200, user, "Profile updated successfully"));
});

// UPDATE AVATAR
export const updateAvatar = asynchandler(async (req, res) => {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
  if (!req.file) throw new ApiError(400, "Image file is required");

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  if (user.avatar?.public_id) {
    await deleteImage(user.avatar.public_id);
  }

  const uploaded = await uploadImage(req.file.buffer, {
    folder: "clothing_store/avatars",
    transformation: [
      { width: 300, height: 300, crop: "fill", gravity: "face", quality: "auto", fetch_format: "auto" }
    ]
  });

  if (!uploaded) throw new ApiError(500, "Failed to upload image");

  user.avatar = { url: uploaded.secure_url, public_id: uploaded.public_id };
  await user.save({ validateBeforeSave: false });

  res.status(200).json(new ApiResponse(200, { avatar: user.avatar }, "Avatar updated successfully"));
});

// CHANGE PASSWORD
export const changePassword = asynchandler(async (req, res) => {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) throw new ApiError(400, "All fields are required");

  if (newPassword.length < 8)
    throw new ApiError(400, "Password must be at least 8 characters");

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const isCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isCorrect) throw new ApiError(401, "Old password is incorrect");

  user.password = newPassword; // pre-save hook hashes it
  await user.save();

  res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

// DELETE ACCOUNT
export const deleteAccount = asynchandler(async (req, res) => {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  if (user.avatar?.public_id) {
    await deleteImage(user.avatar.public_id);
  }

  await User.findByIdAndDelete(req.user._id);

  res
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .status(200)
    .json(new ApiResponse(200, {}, "Account deleted successfully"));
});