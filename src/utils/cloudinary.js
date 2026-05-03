import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,   
  api_key:    process.env.CLOUDINARY_API_KEY,      
  api_secret: process.env.CLOUDINARY_API_SECRET,   
});

const uploadImage = async (fileBuffer, resourceType = "auto") => {  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          resolve(null);
        } else {
          resolve(result);
        }
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

export default uploadImage;