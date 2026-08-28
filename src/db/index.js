import mongoose from "mongoose";

const connect = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not defined in .env file");
    }

    const connectionInstance = await mongoose.connect(uri, {
      dbName: "e-commerce",
      tlsAllowInvalidCertificates: true,
    });

    console.log(
      `\n✅ MongoDB connected successfully! Host: ${connectionInstance.connection.host}, Database: ${connectionInstance.connection.name}\n`
    );
  } catch (error) {
    console.error("\n❌ MongoDB connection error:", error.message || error);
    process.exit(1);
  }
};

export default connect;
