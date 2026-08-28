// ============================================================
// cloudinary.js - Production-Optimized for Clothing E-Commerce
// ============================================================

import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

// Ensure environment variables are loaded
dotenv.config({ path: "./.env" });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Always deliver over HTTPS CDN
});

/**
 * Upload a single image buffer to Cloudinary with production e-commerce optimizations
 * Auto-converts to WebP/AVIF (f_auto) and optimizes compression (q_auto)
 *
 * @param {Buffer} fileBuffer - The image file buffer from Multer
 * @param {Object} options - Upload options (folder, custom tags, transformations)
 * @returns {Promise<Object|null>} Cloudinary upload result
 */
export const uploadImage = async (fileBuffer, options = {}) => {
  if (!fileBuffer) return null;

  const defaultFolder = options.folder || "clothing_store/products";

  const uploadOptions = {
    folder: defaultFolder,
    resource_type: "image",
    transformation: [
      {
        quality: "auto:good", // Optimal balance for garment colors, stitching, and fast loading
        fetch_format: "auto", // Next-gen WebP/AVIF delivery based on user's browser
      },
    ],
    eager: [
      // 4:5 fashion aspect ratio thumbnail for product grid cards
      { width: 400, height: 500, crop: "fill", gravity: "auto", quality: "auto", fetch_format: "auto" },
      // High-resolution image for product zoom and fabric inspection
      { width: 1200, height: 1500, crop: "limit", quality: "auto:best", fetch_format: "auto" },
    ],
    eager_async: false,
    ...options,
  };

  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload error:", error.message || error);
          resolve(null);
        } else {
          const thumbnail = result.eager && result.eager[0] ? result.eager[0].secure_url : result.secure_url;
          const highRes = result.eager && result.eager[1] ? result.eager[1].secure_url : result.secure_url;

          resolve({
            ...result,
            thumbnailUrl: thumbnail,
            highResUrl: highRes,
          });
        }
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Upload a luxury banner image with responsive aspect ratios for Desktop, Mobile & Thumbnails
 *
 * @param {Buffer} fileBuffer - Image buffer from Multer
 * @param {Object} options - Custom options
 * @returns {Promise<Object|null>}
 */
export const uploadBannerImage = async (fileBuffer, options = {}) => {
  if (!fileBuffer) return null;

  const defaultFolder = options.folder || "clothing_store/banners";

  const uploadOptions = {
    folder: defaultFolder,
    resource_type: "image",
    transformation: [
      {
        quality: "auto:best",
        fetch_format: "auto",
      },
    ],
    eager: [
      // 1920x800 ultra-wide desktop hero banner (smart subject-aware crop)
      { width: 1920, height: 800, crop: "fill", gravity: "auto", quality: "auto:best", fetch_format: "auto" },
      // 800x800 mobile banner
      { width: 800, height: 800, crop: "fill", gravity: "auto", quality: "auto:good", fetch_format: "auto" },
      // 400x200 admin preview card
      { width: 400, height: 200, crop: "fill", gravity: "auto", quality: "auto", fetch_format: "auto" },
    ],
    eager_async: false,
    ...options,
  };

  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary banner upload error:", error.message || error);
          resolve(null);
        } else {
          const desktopBanner = result.eager && result.eager[0] ? result.eager[0].secure_url : result.secure_url;
          const mobileBanner = result.eager && result.eager[1] ? result.eager[1].secure_url : result.secure_url;
          const thumbnail = result.eager && result.eager[2] ? result.eager[2].secure_url : result.secure_url;

          resolve({
            ...result,
            bannerOptimizedUrl: desktopBanner,
            mobileBannerUrl: mobileBanner,
            thumbnailUrl: thumbnail,
          });
        }
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Batch upload multiple image buffers in parallel with error isolation
 *
 * @param {Array<Buffer|Object>} files - Array of files from Multer (req.files)
 * @param {Object} options - Custom upload options
 * @returns {Promise<Array<{url: string, public_id: string, thumbnailUrl: string}>>}
 */
export const uploadMultipleImages = async (files = [], options = {}) => {
  if (!Array.isArray(files) || files.length === 0) return [];

  const uploadPromises = files.map((file) => {
    const buffer = Buffer.isBuffer(file) ? file : file.buffer;
    return uploadImage(buffer, options);
  });

  const results = await Promise.all(uploadPromises);

  return results
    .filter(Boolean)
    .map((img) => ({
      url: img.secure_url,
      public_id: img.public_id,
      thumbnailUrl: img.thumbnailUrl || img.secure_url,
    }));
};

/**
 * Safely delete an image from Cloudinary by its public ID
 *
 * @param {string} public_id - Cloudinary asset public ID
 * @returns {Promise<boolean>}
 */
export const deleteImage = async (public_id) => {
  if (!public_id) return true;

  try {
    const res = await cloudinary.uploader.destroy(public_id);
    return res.result === "ok" || res.result === "not found";
  } catch (err) {
    console.error(`❌ Failed to delete Cloudinary asset [${public_id}]:`, err.message);
    return false;
  }
};

/**
 * Safely batch delete multiple images from Cloudinary
 *
 * @param {Array<string>} public_ids - Array of public IDs
 * @returns {Promise<void>}
 */
export const deleteMultipleImages = async (public_ids = []) => {
  const validIds = (public_ids || []).filter(Boolean);
  if (validIds.length === 0) return;

  try {
    await Promise.all(validIds.map((id) => deleteImage(id)));
  } catch (err) {
    console.error("❌ Failed batch deleting Cloudinary assets:", err.message);
  }
};

/**
 * Generate a dynamic, on-the-fly optimized CDN URL with custom responsive parameters
 *
 * @param {string} publicId - Cloudinary asset public_id
 * @param {Object} transform - { width, height, crop, quality, format }
 * @returns {string}
 */
export const buildOptimizedUrl = (publicId, transform = {}) => {
  if (!publicId) return "";

  const cloudName =
    transform.cloudName ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    cloudinary.config().cloud_name;

  if (!cloudName) {
    return `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/${publicId}`;
  }

  return cloudinary.url(publicId, {
    cloud_name: cloudName,
    secure: true,
    quality: transform.quality || "auto:good",
    fetch_format: transform.format || "auto",
    width: transform.width,
    height: transform.height,
    crop: transform.crop || (transform.width && transform.height ? "fill" : "limit"),
    gravity: "auto",
    dpr: "auto",
    ...transform,
  });
};

export default uploadImage;
export { cloudinary };