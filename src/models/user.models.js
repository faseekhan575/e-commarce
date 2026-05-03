import mongoose, { Schema } from "mongoose";
import bycrpt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema({

  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },

  fullname: {
    type: String,
    required: true,
    trim: true,
  },

  avatar: {
    url:       { type: String, default: "" },
    public_id: { type: String, default: "" },
  },

  role: {
    type: String,
    enum: ["user", "admin", "superadmin"],
    default: "user",
  },

  password: {
    type: String,
    default: null,
  },

  tokens: {
    type: [String],
    default: [],
  },
   isVerified: {
    type: Boolean,
    default: false,  // becomes true after OTP verified on first login
  },

  otp: {
    type: String,
    default: null,
  },

  otpExpiry: {
    type: Date,
    default: null,
  },

}, { timestamps: true });


userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return ;
  this.password = await bycrpt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (enteredpassward) { 
  return await bycrpt.compare(enteredpassward, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, role: this.role, email: this.email },
    process.env.ACCESS_TOKEN_SCERET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECERT,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }  
  );
};

export const User = mongoose.model("User", userSchema);