// ============================================================
// corsConfig.js - Robust CORS Configuration
// ============================================================

/**
 * Normalizes an origin string by stripping paths and trailing slashes
 * e.g. "http://localhost:5173/login" -> "http://localhost:5173"
 */
const sanitizeOrigin = (urlStr) => {
  if (!urlStr || urlStr === "*") return urlStr;
  try {
    const parsed = new URL(urlStr);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return urlStr.replace(/\/+$/, "");
  }
};

/**
 * Returns list of allowed origins from environment variables and defaults
 */
export const getAllowedOrigins = () => {
  const envOrigins = [
    process.env.CORS_ORIGIN,
    process.env.CROS_ORIGIN,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://vault-by-fasee.netlify.app",
  ]
    .filter(Boolean)
    .flatMap((orig) => orig.split(","))
    .map((orig) => sanitizeOrigin(orig.trim()))
    .filter(Boolean);

  return [...new Set(envOrigins)];
};

/**
 * CORS Origin Validator Function for Express & Socket.io
 */
export const corsOriginDelegate = (origin, callback) => {
  // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
  if (!origin) {
    return callback(null, true);
  }

  const allowedOrigins = getAllowedOrigins();

  // Allow exact matches or wildcard
  if (
    allowedOrigins.includes("*") ||
    allowedOrigins.includes(origin) ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.includes("netlify.app")
  ) {
    return callback(null, true);
  }

  console.warn(`⚠️ CORS blocked request from unauthorized origin: ${origin}`);
  return callback(new Error(`CORS policy does not allow access from origin: ${origin}`), false);
};

export const corsOptions = {
  origin: corsOriginDelegate,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Set-Cookie"],
};

export default corsOptions;
