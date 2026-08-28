import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "./models/user.models.js";

dotenv.config({ path: "./.env" });

async function migrateAndSeed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "e-commerce",
      tlsAllowInvalidCertificates: true,
    });
    console.log("Connected to MongoDB!");

    // Drop old index if exists and unset googleId: null
    try {
      await mongoose.connection.db.collection("users").dropIndex("googleId_1");
      console.log("✓ Dropped old googleId_1 index");
    } catch (e) {
      console.log("Index googleId_1 drop note:", e.message);
    }

    await mongoose.connection.db.collection("users").updateMany(
      { googleId: null },
      { $unset: { googleId: "" } }
    );
    console.log("✓ Unset null googleId from all users");

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
      console.log("✓ Created admin@clothingden.com (Password: Admin@123 | Role: admin)");
    } else {
      admin.role = "admin";
      admin.isVerified = true;
      admin.password = "Admin@123";
      await admin.save();
      console.log("✓ Updated & verified admin@clothingden.com (Password: Admin@123 | Role: admin)");
    }

    // 2. Ensure owner email
    const ownerEmail = (process.env.EMAIL_USER || "faseehd7.khan@gmail.com").toLowerCase();
    let owner = await User.findOne({ email: ownerEmail });
    if (owner) {
      owner.role = "admin";
      owner.isVerified = true;
      owner.password = "Admin@123";
      await owner.save();
      console.log("✓ Updated owner " + ownerEmail + " to verified admin (Password: Admin@123)!");
    } else {
      owner = new User({
        username: "faseehkhan",
        email: ownerEmail,
        fullname: "Faseeh Khan (Owner)",
        role: "admin",
        password: "Admin@123",
        isVerified: true,
        authProvider: "local",
      });
      await owner.save();
      console.log("✓ Created owner " + ownerEmail + " as verified admin (Password: Admin@123)!");
    }

    const allUsers = await User.find({});
    console.log("\n--- Active Users in Database (" + allUsers.length + ") ---");
    allUsers.forEach(u => {
      console.log("- Email: " + u.email + " | Username: " + u.username + " | Role: " + u.role + " | Verified: " + u.isVerified);
    });

  } catch (e) {
    console.error("Migration/Seed error:", e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrateAndSeed();
