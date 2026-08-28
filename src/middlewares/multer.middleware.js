import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/heic",
    "image/heif",
  ];
  if (!allowed.includes(file.mimetype?.toLowerCase())) {
    return cb(
      new Error("Only JPG, PNG, WEBP, AVIF, and HEIC image formats are supported"),
      false
    );
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for high-res fashion photography
    files: 10, // Max 10 images at once
  },
});

export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        statusCode: 413,
        message: "File too large. Maximum allowed size is 10MB per image.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Too many files uploaded. Maximum 10 images allowed per request.",
      });
    }
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: `Upload error: ${err.message}`,
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: err.message || "File upload failed",
    });
  }
  next();
};