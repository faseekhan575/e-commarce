import mongoose, { Schema } from "mongoose";
import bycrpt from "bcrypt"
import jwt from "jsonwebtoken"
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

}, { timestamps: true });


userSchema.pre("save",async function(next) {
     if (!this.isModified("password")) return next();
     this.password=await bycrpt.hash(this.password,10)
     next()
})

userSchema.method.ispasswordCorrect=async function(enteredpassward
) {
    return await bycrpt.compare(enteredpassward,this.password)
}




export const User = mongoose.model("User", userSchema);