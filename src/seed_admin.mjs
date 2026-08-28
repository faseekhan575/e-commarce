import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "./models/user.models.js";

dotenv.config({ path: "./.env" });

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "e-commerce",
      tlsAllowInvalidCertificates: true,
    });
    console.log("Connected to MongoDB!");

    const allUsers = await User.find({});
    console.log("Total users in DB: " + allUsers.length);
    allUsers.forEach(u => {
      console.log("- " + u.email + " (" + u.username + ") | Role: " + u.role + " | Verified: " + u.isVerified);
    });

    // 1. Ensure admin@clothingden.com
    let admin = await User.findOne({
      $or: [{ email: "admin@clothingden.com" }, { username: "admin" }]
    });

    if (!admin) {
      admin = new User({
        username: "admin",
        email: "admin@clothingden.com",
        fullname: "Clothing Den Administrator",
        role: "admin",
        password: "Admin@123",
        isVerified: true,
        authProvider: "local",
      });
      await admin.save();
      console.log("✓ Created admin@clothingden.com (Password: Admin@123)");
    } else {
      admin.role = "admin";
      admin.isVerified = true;
      admin.password = "Admin@123";
      await admin.save();
      console.log("✓ Updated & verified admin@clothingden.com (Password: Admin@123)");
    }

    // 2. Ensure owner email
    const ownerEmail = (process.env.EMAIL_USER || "faseehd7.khan@gmail.com").toLowerCase();
    let owner = await User.findOne({ email: ownerEmail });
    if (owner) {
      owner.role = "admin";
      owner.isVerified = true;
      await owner.save();
      console.log("✓ Updated owner " + ownerEmail + " to verified admin!");
    } else {
      await User.create({
        username: "faseehkhan",
        email: ownerEmail,
        fullname: "Faseeh Khan (Owner)",
        role: "admin",
        password: "Admin@123",
        isVerified: true,
        authProvider: "local",
      });
      console.log("✓ Created owner " + ownerEmail + " as verified admin!");
    }
  } catch (e) {
    console.error("Seed error:", e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
