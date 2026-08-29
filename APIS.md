# 🛍️ Clothing E-Commerce Backend API Documentation

Welcome to the comprehensive API reference for the **Clothing E-Commerce Platform Backend**.  
Built with **Node.js, Express.js, MongoDB (Mongoose), Socket.io, and Cloudinary**.

---

## 📌 Table of Contents
1. [Base URL & Response Standard](#-base-url--response-standard)
2. [Authentication & Roles](#-authentication--roles)
3. [Authentication & Google Login APIs (`/api/v1/auth`)](#1-authentication-apis-apiv1auth)
4. [User Profile APIs (`/api/v2/user`)](#2-user-profile-apis-apiv2user)
5. [Product & Inventory APIs (`/api/v3/product`)](#3-product--inventory-apis-apiv3product)
6. [Category APIs (`/api/v4/category`)](#4-category-apis-apiv4category)
7. [Cart APIs (`/api/v5/cart`)](#5-cart-apis-apiv5cart)
8. [Order & Payment APIs (`/api/v6/order`)](#6-order--payment-apis-apiv6order)
9. [Review APIs (`/api/v7/review`)](#7-review-apis-apiv7review)
10. [Admin Customer Management APIs (`/api/v8/admin`)](#8-admin-customer-management-apis-apiv8admin)
11. [Admin Analytics & Executive Dashboard APIs (`/api/v9/dashboard`)](#9-admin-analytics--dashboard-apis-apiv9dashboard)
12. [Banner & Store Configuration APIs (`/api/v10/banner`)](#10-banner--store-configuration-apis-apiv10banner)
13. [Editorial Spotlight & Homepage Showcase APIs (`/api/v11/spotlight`)](#11-editorial-spotlight--homepage-showcase-apis-apiv11spotlight)
14. [Cloudinary Cloud Media & CDN Transformations Guide](#12-cloudinary-cloud-media--cdn-transformations-guide)
15. [System Health Check (`/api/health`)](#13-system-health-check-apihealth)
16. [Google OAuth 2.0 Setup Guide](#-google-oauth-20-setup-guide)
17. [Socket.io Real-Time Events](#-socketio-real-time-events)

---


## 🌐 Base URL & Response Standard

- **Development Base URL:** `http://localhost:4000`
- **Production Base URL:** `https://your-domain.com`

### Standard Success Response (`ApiResponse`)
```json
{
  "statusCode": 200,
  "data": { ... },
  "message": "Operation successful",
  "success": true
}
```

### Standard Error Response (`ApiError`)
```json
{
  "statusCode": 400,
  "message": "Error description message",
  "success": false,
  "errors": []
}
```

---

## 🔐 Authentication & Roles

- **Authentication Method:** JWT Token passed via:
  - Header: `Authorization: Bearer <accessToken>`
  - Cookie: `accessToken=<token>` (HTTP-only, Secure)
- **User Roles:**
  - `user`: Standard customer (browsing, cart, orders, reviews, personal profile).
  - `admin`: Single master administrator with 100% store control (inventory, products, hot deals, orders, payments, analytics, customers, review moderation).

### 🧭 Single Login URL with Automatic Role-Based Navigation
Both customers and admins authenticate through the **same single login URL** (`/api/v1/auth/login` or Google Sign-In `/api/v1/auth/google`).

Upon successful login, the backend returns the user's role in `data.user.role`. Frontend developers can automatically direct users to their appropriate panel:

```javascript
// Single Login Handler (React / Next.js / Vue)
const handleLoginSuccess = (response) => {
  const { user } = response.data;
  
  if (user.role === "admin") {
    // Admin redirected to Executive Control Center
    navigate("/admin/dashboard");
  } else {
    // Customer redirected to Storefront / Customer Account
    navigate("/account");
  }
};
```

---

## ⚡ Master API Routes Cheat Sheet (Quick Lookup)

| Module | Method | Endpoint | Access | Key Payload / Query | Description |
|---|---|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/register` | Public | `{ fullname, username, email, password }` | Register new user & send OTP |
| **Auth** | `POST` | `/api/v1/auth/verify-otp` | Public | `{ email, otp }` | Verify OTP & receive JWT tokens |
| **Auth** | `POST` | `/api/v1/auth/login` | Public | `{ email, password }` | Login & detect role (`user` / `admin`) |
| **Auth** | `POST` | `/api/v1/auth/google` | Public | `{ credential }` (Google ID Token) | One-click Google Sign-In & auto role |
| **Auth** | `POST` | `/api/v1/auth/refresh-token`| Public | (HTTP-only cookie or `{ refreshToken }`) | Regenerate access token |
| **Auth** | `POST` | `/api/v1/auth/logout` | Logged In | None | Clear cookies & logout |
| **Auth** | `POST` | `/api/v1/auth/forgot-password`| Public | `{ email }` | Send password reset link/code |
| **Auth** | `POST` | `/api/v1/auth/reset-password` | Public | `{ email, resetToken, newPassword }` | Set new password |
| **User** | `GET` | `/api/v2/user/profile` | User/Admin | None | Get current profile & cart count |
| **User** | `PATCH`| `/api/v2/user/profile` | User/Admin | `{ fullname, phone, address }` | Update profile info |
| **User** | `PATCH`| `/api/v2/user/avatar` | User/Admin | `multipart/form-data` (`avatar`) | Upload new profile photo to Cloudinary |
| **User** | `PATCH`| `/api/v2/user/change-password`| User/Admin| `{ oldPassword, newPassword }` | Change password |
| **Product** | `GET` | `/api/v3/product` | Public | `?page=&limit=&category=&fabric=&sort=` | Search & browse catalog |
| **Product** | `GET` | `/api/v3/product/hot` | Public | `?limit=8&category=` | Hot deals & featured products |
| **Product** | `GET` | `/api/v3/product/top-selling` | Public | `?fabric=cambric&limit=8` | Top selling apparel with fabric filter |
| **Product** | `GET` | `/api/v3/product/fabrics` | Public | None | List of available fabric filter pills |
| **Product** | `GET` | `/api/v3/product/admin/all` | Admin | `?search=&stockStatus=&isActive=&sort=` | Full inventory inspection view |
| **Product** | `GET` | `/api/v3/product/admin/low-stock`| Admin | `?threshold=5` | Low-stock and out-of-stock alerts |
| **Product** | `POST`| `/api/v3/product/create` | Admin | `multipart/form-data` (`images`, fields) | Create product with up to 10 photos |
| **Product** | `GET` | `/api/v3/product/:productid`| Public | None | Product detail (increments views) |
| **Product** | `PATCH`| `/api/v3/product/:productid/update`| Admin | `multipart/form-data` or JSON | Update product details & specifications |
| **Product** | `PATCH`| `/api/v3/product/:productid/stock` | Admin | `{ stock: 50 }` or `{ stockDelta: -2 }` | Quick 1-click stock update |
| **Product** | `PATCH`| `/api/v3/product/:productid/toggle-size`| Admin | `{ size: "M", isAvailable: false }` | 1-Click toggle size in/out of stock |
| **Product** | `PATCH`| `/api/v3/product/:productid/size-stock` | Admin | `{ size: "XL", stock: 25 }` | Update individual size stock variant |
| **Product** | `PATCH`| `/api/v3/product/:productid/toggle-hot` | Admin | `{ isHot: true, isFeatured: true }` | Quick toggle Hot / Featured status |
| **Product** | `PATCH`| `/api/v3/product/:productid/image/set-default`| Admin | `{ public_id }` or `{ imageIndex: 0 }` | Set primary front cover photo |
| **Product** | `PATCH`| `/api/v3/product/:productid/image/set-hover` | Admin | `{ public_id }` or `{ imageIndex: 1 }` | Set 2nd hover preview photo |
| **Product** | `PATCH`| `/api/v3/product/:productid/image/reorder` | Admin | `{ public_ids: [...] }` | Reorder gallery photo sequence |
| **Product** | `POST` | `/api/v3/product/:productid/image/add` | Admin | `multipart/form-data` (`images`) | Batch add up to 10 extra photos |
| **Product** | `DELETE`| `/api/v3/product/:productid/image/delete`| Admin | `{ public_id }` | Delete specific gallery photo |
| **Product** | `DELETE`| `/api/v3/product/:productid/delete` | Admin | None | Delete product & destroy Cloudinary media |
| **Product** | `GET` | `/api/v3/product/:productid/analytics` | Admin | None | Product profit, conversion & sales |
| **Category**| `GET` | `/api/v4/category` | Public | None | List categories with live product count |
| **Category**| `GET` | `/api/v4/category/hot` | Public | None | Hot categories for carousel |
| **Category**| `GET` | `/api/v4/category/:categoryid` | Public | None | Single category detail |
| **Category**| `GET` | `/api/v4/category/:categoryid/products` | Public | `?page=&limit=&sort=` | All products under category |
| **Category**| `POST`| `/api/v4/category/create` | Admin | `multipart/form-data` (`image`, name, slug, subtitle) | Create category with cover image |
| **Category**| `PATCH`| `/api/v4/category/:categoryid/update` | Admin | `multipart/form-data` or JSON | Update category details & image |
| **Category**| `PATCH`| `/api/v4/category/:categoryid/toggle-hot`| Admin | `{ isHot: true }` | 1-Click toggle hot category |
| **Category**| `DELETE`| `/api/v4/category/:categoryid/delete` | Admin | None | Delete category (protected if active products) |
| **Cart** | `GET` | `/api/v5/cart` | Customer | None | View active cart with live stock |
| **Cart** | `POST`| `/api/v5/cart/add` | Customer | `{ productId, quantity, size, color }` | Add item with size & color |
| **Cart** | `PATCH`| `/api/v5/cart/quantity` | Customer | `{ productId, quantity, size }` | Update item quantity |
| **Cart** | `DELETE`| `/api/v5/cart/remove` | Customer | `{ productId, size }` | Remove single item from cart |
| **Cart** | `DELETE`| `/api/v5/cart/clear` | Customer | None | Empty complete cart |
| **Order** | `POST`| `/api/v6/order/place` | Customer | `{ shippingAddress, paymentMethod, items? }` | Place order (stock deducted atomically, profit snapshotted, real-time socket emit) |
| **Order** | `GET` | `/api/v6/order/my` | Customer | None | View personal order history |
| **Order** | `PATCH`| `/api/v6/order/:orderid/cancel`| Customer | None | Cancel order & auto-restore stock |
| **Order** | `GET` | `/api/v6/order/all` | Admin | `?search=&status=&paymentStatus=` | Full order book |
| **Order** | `GET` | `/api/v6/order/download` | Admin | None | Export CSV report with profit & tracking |
| **Order** | `GET` | `/api/v6/order/:orderid` | User/Admin | None | Order detail with tracking timeline |
| **Order** | `PATCH`| `/api/v6/order/:orderid/status` | Admin | `{ status, paymentStatus }` | Update order status & payment |
| **Order** | `PATCH`| `/api/v6/order/:orderid/tracking` | Admin | `{ courier, trackingNumber, trackingUrl, estimatedDelivery }` | Update courier & dispatch |
| **Review** | `GET` | `/api/v7/review/:productid` | Public | None | Get reviews for product |
| **Review** | `POST`| `/api/v7/review/:productid/add`| Customer | `{ rating, comment, title }` | Submit verified purchase review |
| **Review** | `GET` | `/api/v7/review/admin/all` | Admin | None | Moderate all customer reviews |
| **Review** | `DELETE`| `/api/v7/review/:reviewid/delete`| User/Admin| None | Delete review |
| **Admin** | `GET` | `/api/v8/admin/users` | Admin | None | Customer database with spend & orders |
| **Admin** | `GET` | `/api/v8/admin/users/:userid`| Admin | None | Customer 360 inspector |
| **Admin** | `DELETE`| `/api/v8/admin/users/:userid`| Admin | None | Delete spam/abusive account |
| **Dashboard**| `GET`| `/api/v9/dashboard/stats` | Admin | None | Lifetime Gross Revenue, Net Profit, Margin %, Inventory Cost Valuation, Category Share, Charts |
| **Dashboard**| `GET`| `/api/v9/dashboard/live-orders`| Admin | None | Live pending & processing order feed |
| **Dashboard**| `GET`| `/api/v9/dashboard/monthly-orders`| Admin | `?year=2026&month=8` | Monthly financial breakdown |
| **Dashboard**| `GET`| `/api/v9/dashboard/inventory-summary`| Admin | None | Stock distribution & valuation |
| **Dashboard**| `GET`| `/api/v9/dashboard/order/:orderid`| Admin | None | Deep order inspector |
| **Banner** | `GET` | `/api/v10/banner` | Public | `?collectionType=` | Active campaign hero banners |
| **Banner** | `POST`| `/api/v10/banner/create` | Admin | `multipart/form-data` (`image`, fields) | Create campaign hero banner |
| **Banner** | `PATCH`| `/api/v10/banner/:bannerid/update`| Admin | `multipart/form-data` or JSON | Update banner & styling |
| **Banner** | `PATCH`| `/api/v10/banner/:bannerid/toggle-active`| Admin | None | 1-Click toggle active |
| **Banner** | `GET` | `/api/v10/banner/admin/all` | Admin | None | Full banner configuration panel |
| **Banner** | `DELETE`| `/api/v10/banner/:bannerid/delete`| Admin | None | Delete banner & Cloudinary media |
| **Spotlight**| `GET` | `/api/v11/spotlight` | Public | None | Active lookbook spotlight |
| **Spotlight**| `GET` | `/api/v11/spotlight/homepage` | Public | None | **Unified Homepage Aggregator** (Banners + Categories + Fabrics + Top Selling + Spotlight) |
| **Spotlight**| `GET` | `/api/v11/spotlight/admin/all` | Admin | None | Full spotlight list |
| **Spotlight**| `POST`| `/api/v11/spotlight/create` | Admin | `multipart/form-data` (`image`, fields) | Create lookbook section with hotspot pin |
| **Spotlight**| `PATCH`| `/api/v11/spotlight/:spotlightid/update`| Admin | `multipart/form-data` or JSON | Update spotlight details & hotspot |
| **Spotlight**| `PATCH`| `/api/v11/spotlight/:spotlightid/toggle-active`| Admin | None | 1-Click toggle active |
| **Spotlight**| `DELETE`| `/api/v11/spotlight/:spotlightid/delete`| Admin | None | Delete spotlight & Cloudinary media |
| **Health** | `GET` | `/api/health` | Public | None | Server & MongoDB health status |

---

## 1. Authentication APIs (`/api/v1/auth`)


### 1.1 Register User
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/register`
- **Access:** Public
- **Body:** `application/json`
```json
{
  "fullname": "John Doe",
  "username": "johndoe",
  "email": "johndoe@example.com",
  "password": "Password123"
}
```
- **Response:** `200 OK` (OTP sent to user's email)

---

### 1.2 Verify Email OTP
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/verify-otp`
- **Access:** Public
- **Body:** `application/json`
```json
{
  "email": "johndoe@example.com",
  "otp": "123456"
}
```
- **Response:** `200 OK` (Returns user object, `accessToken`, and `refreshToken`)

---

### 1.3 Login User (Email & Password)
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/login`
- **Access:** Public
- **Body:** `application/json`
```json
{
  "email": "johndoe@example.com",
  "password": "Password123"
}
```
- **Response:** `200 OK` (Returns user info and sets auth cookies)

---

### 1.4 Google OAuth 2.0 Login / Sign-In
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/google`
- **Access:** Public
- **Body:** `application/json`
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "credential": "optional_google_credential_jwt",
  "email": "johndoe@gmail.com",
  "fullname": "John Doe",
  "avatar": "https://lh3.googleusercontent.com/a/...",
  "googleId": "109876543210987654321"
}
```
- **Behavior:**
  - Automatically verifies Google ID token with Google's servers.
  - Automatically creates a new user (with `authProvider: "google"`, `isVerified: true`, Google profile avatar) or links existing accounts with matching email.
  - Issues JWT `accessToken` & `refreshToken` and sets HTTP-only cookies.
- **Success Response:** `200 OK`
```json
{
  "statusCode": 200,
  "data": {
    "_id": "66ce...",
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "role": "user",
    "email": "johndoe@gmail.com",
    "username": "johndoe491",
    "fullname": "John Doe",
    "avatar": { "url": "https://lh3.googleusercontent.com/..." },
    "authProvider": "google"
  },
  "message": "Logged in with Google successfully",
  "success": true
}
```

---

### 1.5 Direct Browser Google Redirect (Zero NPM packages on frontend)
- **Method:** `GET`
- **Endpoint:** `/api/v1/auth/google/redirect`
- **Access:** Public
- **Behavior:** Redirects the user's browser directly to Google's account picker screen (`prompt=select_account`).

---

### 1.6 Google OAuth Callback
- **Method:** `GET`
- **Endpoint:** `/api/v1/auth/google/callback`
- **Access:** Public (Called by Google)
- **Behavior:** Exchanges code for tokens, logs in or auto-creates user, sets cookies, and redirects browser back to frontend with query tokens: `http://localhost:5173/?login=success&token=<jwt>&role=user`.

---

### 1.7 Get Current Authenticated User (`/me`)
- **Method:** `GET`
- **Endpoint:** `/api/v1/auth/me`
- **Access:** Authenticated (`user` or `admin`)
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` (Returns currently logged-in user profile with role)

---

### 1.8 Forgot Password (Request OTP)
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/forgot-password`
- **Access:** Public
- **Body:** `application/json`
```json
{
  "email": "johndoe@example.com"
}
```

---

### 1.9 Verify Reset Password OTP
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/verify-reset-otp`
- **Access:** Public
- **Body:** `application/json`
```json
{
  "email": "johndoe@example.com",
  "otp": "123456"
}
```

---

### 1.10 Reset Password
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/reset-password`
- **Access:** Public
- **Body:** `application/json`
```json
{
  "email": "johndoe@example.com",
  "otp": "123456",
  "newPassword": "NewStrongPassword123"
}
```

---

### 1.11 Logout
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/logout`
- **Access:** Authenticated
- **Response:** `200 OK` (Clears auth cookies)


---

## 2. User Profile APIs (`/api/v2/user`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v2/user/profile` | Authenticated | Get current user's profile |
| `PATCH` | `/api/v2/user/profile/update` | Authenticated | Update fullname, username, or email |
| `PATCH` | `/api/v2/user/profile/avatar` | Authenticated | Upload new profile avatar (`multipart/form-data`, field: `avatar`) |
| `PATCH` | `/api/v2/user/change-password` | Authenticated | Change password (`oldPassword`, `newPassword`) |
| `DELETE` | `/api/v2/user/delete-account` | Authenticated | Permanently delete account and avatar |

---

## 3. Product & Inventory APIs (`/api/v3/product`)

### 3.1 Get All Active Products (Public Catalog)
- **Method:** `GET`
- **Endpoint:** `/api/v3/product`
- **Access:** Public
- **Query Parameters:**
  - `page` (number, default: 1)
  - `limit` (number, default: 12)
  - `category` (category ID or slug)
  - `search` (searches title, description, tags)
  - `minPrice` & `maxPrice` (price range filter)
  - `isHot` (`true` / `false`)
  - `isFeatured` (`true` / `false`)
  - `sort` (`newest`, `price-asc`, `price-desc`, `popular`, `rating`)

---

### 3.2 Get Hot & Featured Products (Homepage Showcase)
- **Method:** `GET`
- **Endpoint:** `/api/v3/product/hot`
- **Access:** Public
- **Query Parameters:**
  - `limit` (number, default: 8)
  - `type` (`hot`, `featured`, or default: both)
  - `category` (category ID or slug)
- **Response:** `200 OK` (Array of hot products with auto-generated WebP thumbnails)

---

### 3.3 Get Single Product Details
- **Method:** `GET`
- **Endpoint:** `/api/v3/product/:productid`
- **Access:** Public (automatically increments product view analytics)
- **Response:** `200 OK` (Full product details, images gallery, category populate)

---

### 3.4 Create Product (Admin Only)
- **Method:** `POST`
- **Endpoint:** `/api/v3/product/create`
- **Access:** `Admin`
- **Content-Type:** `multipart/form-data` or `application/json`
- **Fields:**
  - `title` (string, required - e.g. "Embroidered Luxury Lawn Kurta")
  - `description` (string, required)
  - `price` (number, required)
  - `discountPrice` (number, optional)
  - `category` (ObjectId, required)
  - `sizes` (array or comma-separated string, e.g. `["XS", "S", "M", "L", "XL", "XXL"]`)
  - `sizeVariants` (array of objects or JSON string, e.g. `[{"size": "S", "stock": 10, "isAvailable": true}, {"size": "M", "stock": 15, "isAvailable": true}, {"size": "L", "stock": 0, "isAvailable": false}]`)
  - `colors` (array of objects or JSON string, e.g. `[{"name": "Navy Blue", "hex": "#000080", "isAvailable": true}]`)
  - `fabric` (string, e.g. "100% Egyptian Cotton Lawn")
  - `fit` (string, e.g. "Slim Fit", "Regular Fit", "Oversized")
  - `season` (string, e.g. "Summer '26", "Festive Drop")
  - `sku` (string, e.g. "CD-LAWN-2026")
  - `careInstructions` (string, e.g. "Machine wash cold with like colors. Do not bleach.")
  - `sizeGuide` (object or JSON string, e.g. `{"chest": "40 in", "length": "42 in", "shoulder": "16 in", "waist": "36 in"}`)
  - `stock` (number, total stock)
  - `tags` (string or array, e.g. "summer,lawn,embroidered")
  - `isHot` (boolean, optional)
  - `isFeatured` (boolean, optional)
  - `image` or `images` (1 to 10 image files, e.g. front angle, back angle, fabric detail, model shots. Automatically processed by Cloudinary with responsive 4:5 fashion thumbnails)

---


### 3.5 Update Product Details (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v3/product/:productid/update`
- **Access:** `Admin`
- **Content-Type:** `multipart/form-data` or `application/json`
- **Fields:** Any of `title`, `description`, `price`, `discountPrice`, `stock`, `category`, `tags`, `isActive`, `isHot`, `isFeatured`, `sizes`, `sizeVariants`, `colors`, `fabric`, `fit`, `season`, `sku`, `careInstructions`, `sizeGuide`, `image`.

---

### 3.6 Quick Stock Update (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v3/product/:productid/stock`
- **Access:** `Admin`
- **Body:** `application/json`
```json
{
  "stock": 50
}
```
*Or relative delta:*
```json
{
  "stockDelta": -5
}
```

---

### 3.7 1-Click Toggle Size Availability (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v3/product/:productid/toggle-size`
- **Access:** `Admin`
- **Body:** `application/json`
```json
{
  "size": "M",
  "isAvailable": false
}
```
- **Behavior:** Instantly enables or disables a specific size (so frontend displays "M - Out of Stock" or crosses it out).

---

### 3.8 Update Size Specific Stock (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v3/product/:productid/size-stock`
- **Access:** `Admin`
- **Body:** `application/json`
```json
{
  "size": "XL",
  "stock": 25
}
```
- **Response:** `200 OK` (Updates XL stock and recalculates total product stock automatically).

---

### 3.9 Toggle Hot / Featured Status (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v3/product/:productid/toggle-hot`
- **Access:** `Admin`
- **Body:** `application/json` (optional)
```json
{
  "isHot": true,
  "isFeatured": true
}
```


### 3.10 Delete Product (Admin Only)
- **Method:** `DELETE`
- **Endpoint:** `/api/v3/product/:productid/delete`
- **Access:** `Admin`
- **Behavior:** Deletes product and removes all related images from Cloudinary CDN.

---

### 3.11 Admin Full Inventory List
- **Method:** `GET`
- **Endpoint:** `/api/v3/product/admin/all`
- **Access:** `Admin`
- **Query Parameters:** `page`, `limit`, `category`, `search`, `isActive`, `isHot`, `stockStatus` (`out_of_stock`, `low_stock`, `in_stock`), `sort` (`stock-asc`, `stock-desc`, `sales-desc`, `views-desc`, `price-asc`, `price-desc`)

---

### 3.12 Low Stock & Out of Stock Alerts
- **Method:** `GET`
- **Endpoint:** `/api/v3/product/admin/low-stock?threshold=5`
- **Access:** `Admin`
- **Response:** `200 OK` (Returns lists and counts of out-of-stock and low-stock items)

---

### 3.13 Product Financials & Profit Analytics
- **Method:** `GET`
- **Endpoint:** `/api/v3/product/:productid/analytics`
- **Access:** `Admin`
- **Response:** `200 OK`
```json
{
  "statusCode": 200,
  "data": {
    "financials": {
      "effectivePrice": 4500,
      "costPrice": 1800,
      "profitPerUnit": 2700,
      "profitMarginPercent": "60.0%",
      "unitsSold": 14,
      "totalRevenue": 63000,
      "totalProfit": 37800,
      "currentStock": 36,
      "currentInventoryCostValue": 64800,
      "potentialRetailValue": 162000,
      "potentialRemainingProfit": 97200
    },
    "engagement": {
      "views": 250,
      "addedToCart": 32,
      "conversionRate": "5.60%"
    }
  }
}
```

---

### 3.14 Product Image Operations (Default Cover, Hover & Gallery)
- **Add Image(s) to Gallery:** `POST /api/v3/product/:productid/image/add`
  - **Access:** `Admin` (`multipart/form-data`, field: `image` or `images`, up to 10 files)
- **Set Default Cover Image:** `PATCH /api/v3/product/:productid/image/set-default`
  - **Access:** `Admin` (`body: { "public_id": "clothing_store/products/..." }` or `{ "imageIndex": 0 }`)
  - **Behavior:** Designates the chosen photo as the primary cover picture shown on store shelves.
- **Set Hover Image:** `PATCH /api/v3/product/:productid/image/set-hover`
  - **Access:** `Admin` (`body: { "public_id": "clothing_store/products/..." }` or `{ "imageIndex": 1 }`)
  - **Behavior:** Designates the 2nd photo shown when a customer hovers their mouse over the product card.
- **Reorder Gallery Images:** `PATCH /api/v3/product/:productid/image/reorder`
  - **Access:** `Admin` (`body: { "public_ids": ["id_1", "id_2", "id_3"] }`)
- **Delete Single Image:** `DELETE /api/v3/product/:productid/image/delete`
  - **Access:** `Admin` (`body: { "public_id": "clothing_store/products/..." }`)

---

## 4. Category APIs (`/api/v4/category`)

### 4.1 Get All Categories (with Product Counts)
- **Method:** `GET`
- **Endpoint:** `/api/v4/category`
- **Access:** Public
- **Query Parameters:** `isHot=true`, `isFeatured=true`
- **Response:** `200 OK` (List of categories with live `productCount`)

---

### 4.2 Get Hot Categories (Homepage Carousel)
- **Method:** `GET`
- **Endpoint:** `/api/v4/category/hot?limit=6`
- **Access:** Public

---

### 4.3 Get Single Category Details
- **Method:** `GET`
- **Endpoint:** `/api/v4/category/:categoryid`
- **Access:** Public (Accepts category ObjectId or unique slug)

---

### 4.4 Get All Products Under Category (Category Showcase)
- **Method:** `GET`
- **Endpoint:** `/api/v4/category/:categoryid/products`
- **Access:** Public
- **Query Parameters:** `page`, `limit`, `minPrice`, `maxPrice`, `isHot`, `isFeatured`, `sort`, `inStockOnly`
- **Response:** `200 OK` (Category metadata + paginated products list)

---

### 4.5 Create Category (Admin Only)
- **Method:** `POST`
- **Endpoint:** `/api/v4/category/create`
- **Access:** `Admin`
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `name` (string, required, e.g. "Luxury Lawn '26")
  - `slug` (string, required, e.g. "luxury-lawn-26")
  - `description` (string, optional)
  - `isHot` (boolean, optional)
  - `isFeatured` (boolean, optional)
  - `image` (file, cover thumbnail)

---

### 4.6 Update Category (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v4/category/:categoryid/update`
- **Access:** `Admin`
- **Form Fields:** `name`, `slug`, `description`, `isHot`, `isFeatured`, `image` (file)

---

### 4.7 Toggle Hot Category (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v4/category/:categoryid/toggle-hot`
- **Access:** `Admin`
- **Body:** `{ "isHot": true }`

---

### 4.8 Delete Category (Admin Only)
- **Method:** `DELETE`
- **Endpoint:** `/api/v4/category/:categoryid/delete`
- **Access:** `Admin`
- **Protection:** Prevents deletion if active products are assigned to this category.

---


## 5. Cart APIs (`/api/v5/cart`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v5/cart` | Customer | Get customer's cart with live sizes, colors, pricing, and stock status |
| `POST` | `/api/v5/cart/add` | Customer | Add item with size and color (`{ "productId": "...", "quantity": 1, "size": "M", "color": "Navy Blue" }`) |
| `PATCH` | `/api/v5/cart/quantity` | Customer | Update item quantity in cart (`{ "productId": "...", "quantity": 3, "size": "M" }`) |
| `DELETE` | `/api/v5/cart/remove` | Customer | Remove specific item by product + size or `itemId` (`{ "productId": "...", "size": "M" }`) |
| `DELETE` | `/api/v5/cart/clear` | Customer | Clear entire cart |

---

## 6. Order & Payment APIs (`/api/v6/order`)

### 6.1 Place Order (Customer)
- **Method:** `POST`
- **Endpoint:** `/api/v6/order/place`
- **Access:** Customer
- **Behavior:**
  - Validates inventory stock and automatically deducts stock.
  - Snapshots product prices, selected sizes, and colors at checkout.
  - Clears customer cart.
  - Emits real-time Socket.io event (`new_order`) to `admin_room`.
- **Body:** `application/json`
```json
{
  "shippingAddress": {
    "street": "123 Fashion Blvd",
    "city": "New York",
    "country": "USA",
    "zip": "10001"
  },
  "paymentMethod": "cod"
}
```
- **Response:** `201 Created` (Order with snapshot of items, sizes, quantities, and tracking status)


---

### 6.2 Get My Orders (Customer)
- **Method:** `GET`
- **Endpoint:** `/api/v6/order/my`
- **Access:** Customer
- **Response:** `200 OK` (Customer's personal order history sorted newest first)

---

### 6.3 Cancel Pending Order (Customer)
- **Method:** `PATCH`
- **Endpoint:** `/api/v6/order/:orderid/cancel`
- **Access:** Customer
- **Behavior:** Cancels pending order and **automatically restores product inventory stock**.

---

### 6.4 Get All Orders (Admin Only)
- **Method:** `GET`
- **Endpoint:** `/api/v6/order/all`
- **Access:** `Admin`
- **Query Parameters:**
  - `page`, `limit`
  - `status` (`pending`, `processing`, `shipped`, `delivered`, `cancelled`)
  - `paymentStatus` (`unpaid`, `paid`, `refunded`)
  - `paymentMethod` (`card`, `cash_on_delivery`, etc.)
  - `search` (order ID, customer name, email)

---

### 6.5 Get Order Details
- **Method:** `GET`
- **Endpoint:** `/api/v6/order/:orderid`
- **Access:** Customer (own order) / `Admin` (any order)

---

### 6.6 Update Order Status & Payment Status (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v6/order/:orderid/status`
- **Access:** `Admin`
- **Body:** `application/json`
```json
{
  "status": "shipped",
  "paymentStatus": "paid"
}
```
*(If status changed to `cancelled`, product stock is automatically restored).*

---

### 6.7 Update Order Courier Tracking & Dispatch (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v6/order/:orderid/tracking`
- **Access:** `Admin`
- **Body:** `application/json`
```json
{
  "trackingNumber": "TCS-987654321",
  "courier": "TCS Express",
  "trackingUrl": "https://www.tcsexpress.com/track/TCS-987654321",
  "estimatedDelivery": "2026-09-02T18:00:00.000Z",
  "note": "Package handed over to TCS courier rider"
}
```
- **Behavior:**
  - Saves tracking details.
  - Automatically advances pending order status to `shipped`.
  - Appends milestone to order `timeline`.
  - Emits real-time Socket.io update to customer's device.

---

### 6.8 Download Orders CSV Report (Admin Only)
- **Method:** `GET`
- **Endpoint:** `/api/v6/order/download`
- **Access:** `Admin`
- **Response:** CSV file attachment (`orders-report-<date>.csv`) ready for Excel/Google Sheets.

---

## 7. Review APIs (`/api/v7/review`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v7/review/:productid` | Public | Get all approved reviews for a product |
| `POST` | `/api/v7/review/:productid/add` | Customer | Add review with rating (1-5), comment, and photos (`multipart/form-data`). Verified purchase required. |
| `GET` | `/api/v7/review/admin/all` | `Admin` | Get all reviews across the store for moderation |
| `DELETE` | `/api/v7/review/:reviewid/delete` | User / `Admin` | Delete review and clean up review photos on Cloudinary |

---

## 8. Admin Customer Management APIs (`/api/v8/admin`)

### 8.1 Get All Customers (CRM)
- **Method:** `GET`
- **Endpoint:** `/api/v8/admin/users`
- **Access:** `Admin`
- **Query Parameters:** `page`, `limit`, `search`, `isVerified`
- **Response:** `200 OK` (List of customers with **total orders count** and **total lifetime spent**)

---

### 8.2 Get Customer Detailed Profile
- **Method:** `GET`
- **Endpoint:** `/api/v8/admin/users/:userid`
- **Access:** `Admin`
- **Response:** `200 OK` (Customer profile, full order history, active cart items, and submitted reviews)

---

### 8.3 Delete Spam/Abusive Customer
- **Method:** `DELETE`
- **Endpoint:** `/api/v8/admin/users/:userid`
- **Access:** `Admin`
- **Protection:** Cannot delete admin accounts. Cleans up avatar from Cloudinary.

---

## 9. Admin Analytics & Dashboard APIs (`/api/v9/dashboard`)

### 9.1 Executive Financial & Store Analytics
- **Method:** `GET`
- **Endpoint:** `/api/v9/dashboard/stats`
- **Access:** `Admin`
- **Response Metrics:**
  - **Financials:** Gross Lifetime Revenue, Total Net Profit, Net Profit Margin %, Today's Profit, This Month's Profit, Average Order Value (AOV).
  - **Inventory Valuation:** Total Units in Stock, Capital Locked at Cost Value ($), Potential Retail Value ($), Potential Remaining Profit in Warehouse ($).
  - **Order Counts by Status:** Pending, Processing, Shipped, Delivered, Cancelled.
  - **Payment Status Breakdown:** Paid, Unpaid, Refunded.
  - **Category Breakdown:** Grouped by category with revenue, net profit, and items sold.
  - **Daily Performance Charts:** Day-by-day orders count, gross revenue, and net profit for the entire month.
- **Example Response:** `200 OK`
```json
{
  "statusCode": 200,
  "data": {
    "overview": {
      "totalRevenue": 1450000,
      "totalProfit": 680000,
      "profitMargin": "46.9%",
      "revenueToday": 35000,
      "profitToday": 16500,
      "revenueThisMonth": 480000,
      "profitThisMonth": 225000,
      "revenueGrowth": "24.5%",
      "averageOrderValue": "$125.00",
      "totalOrders": 1160,
      "totalProducts": 48,
      "inventoryUnits": 1280,
      "inventoryCostValue": 840000,
      "inventoryRetailValue": 1920000,
      "potentialInventoryProfit": 1080000
    },
    "categoryRevenue": [
      { "category": "Luxury Lawn '26", "revenue": 850000, "profit": 420000, "itemsSold": 340 },
      { "category": "Chiffon Festive", "revenue": 600000, "profit": 260000, "itemsSold": 180 }
    ],
    "chartData": [
      { "day": 1, "orders": 12, "revenue": 45000, "profit": 21000 },
      { "day": 2, "orders": 18, "revenue": 68000, "profit": 32000 }
    ]
  }
}
```

---


### 9.2 Live Orders Feed
- **Method:** `GET`
- **Endpoint:** `/api/v9/dashboard/live-orders`
- **Access:** `Admin`
- **Response:** Real-time list of pending and processing orders.

---

### 9.3 Monthly Revenue Breakdown
- **Method:** `GET`
- **Endpoint:** `/api/v9/dashboard/monthly-orders`
- **Access:** `Admin`

---

### 9.4 Inventory Valuation Summary
- **Method:** `GET`
- **Endpoint:** `/api/v9/dashboard/inventory-summary`
- **Access:** `Admin`

---

### 9.5 Detailed Order Inspector
- **Method:** `GET`
- **Endpoint:** `/api/v9/dashboard/order/:orderid`
- **Access:** `Admin`

---

## 10. Banner & Store Configuration APIs (`/api/v10/banner`)

Transform any normal photo into a magazine-grade luxury fashion campaign with customizable overlay text, badges, and responsive Cloudinary CDN crops (1920x800 desktop ultra-wide, 800x800 mobile, and 400x200 thumbnails).

### 10.1 Get All Active Banners (Public - Homepage Hero Carousel)
- **Method:** `GET`
- **Endpoint:** `/api/v10/banner`
- **Access:** Public
- **Query Parameters:**
  - `collectionType` (optional: `new_arrivals`, `summer_collection`, `monthly_drop`, `winter_collection`, `flash_sale`, `featured_hero`, `custom`)
- **Response:** `200 OK` (Returns active banners sorted by priority descending with full styling properties)

---

### 10.2 Get Banners by Collection
- **Method:** `GET`
- **Endpoint:** `/api/v10/banner/collection/:collectionType`
- **Access:** Public
- **Example:** `/api/v10/banner/collection/summer_collection`

---

### 10.3 Get Single Banner / Live Styling Preview
- **Method:** `GET`
- **Endpoint:** `/api/v10/banner/:bannerid`
- **Access:** Public / `Admin`

---

### 10.4 Create Luxury Banner (Admin Only)
- **Method:** `POST`
- **Endpoint:** `/api/v10/banner/create`
- **Access:** `Admin`
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `title` (string, required - e.g. "SUMMER LUXURY '26")
  - `subtitle` (string - e.g. "Up to 40% Off New Season Fits")
  - `badge` (string - e.g. "NEW ARRIVALS", "LIMITED DROP", "HOT DEAL")
  - `collectionType` (`new_arrivals`, `monthly_drop`, `summer_collection`, `winter_collection`, `flash_sale`, `featured_hero`, `custom`)
  - `ctaText` (string - e.g. "Shop Collection")
  - `ctaLink` (string - e.g. "/category/summer-collection" or "/product/hot")
  - `textPosition` (`left`, `center`, `right`, default: `left`)
  - `textColor` (hex color, default: `#FFFFFF`)
  - `overlayOpacity` (number 0.0 to 1.0, default: `0.4` for sleek luxury dark contrast)
  - `theme` (`dark`, `light`, `gradient`, `minimal`)
  - `priority` (number for sorting in carousels, higher numbers appear first)
  - `isActive` (boolean, default: `true`)
  - `image` (file, image upload - automatically processed by Cloudinary into 21:9 & 16:9 ultra-wide banner assets)

---

### 10.5 Update Banner (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v10/banner/:bannerid/update`
- **Access:** `Admin`
- **Content-Type:** `multipart/form-data`
- **Form Fields:** Any of `title`, `subtitle`, `badge`, `collectionType`, `ctaText`, `ctaLink`, `textPosition`, `textColor`, `overlayOpacity`, `theme`, `priority`, `isActive`, `image` (optional replacement file).

---

### 10.6 Quick 1-Click Toggle Active Status (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v10/banner/:bannerid/toggle-active`
- **Access:** `Admin`
- **Response:** `200 OK` (`{ "_id": "...", "title": "...", "isActive": true/false }`)

---

### 10.7 Admin All Banners List (Admin Config Panel)
- **Method:** `GET`
- **Endpoint:** `/api/v10/banner/admin/all`
- **Access:** `Admin`
- **Query Parameters:** `collectionType`, `isActive`
- **Response:** `200 OK` (List of all banners, active counts, and inactive counts)

---

### 10.8 Delete Banner (Admin Only)
- **Method:** `DELETE`
- **Endpoint:** `/api/v10/banner/:bannerid/delete`
- **Access:** `Admin`
- **Behavior:** Deletes database document and destroys all banner image assets on Cloudinary CDN.

## 11. Editorial Spotlight & Homepage Showcase APIs (`/api/v11/spotlight`)

Empower store admins to dynamically curate the entire homepage experience: **Hero Banners ➔ Wardrobe Categories ➔ Top Selling Apparel with Fabric Filters ➔ Editorial "Shop The Look" Spotlight**.

---

### 11.1 Get Active Editorial Spotlight (Public)
- **Method:** `GET`
- **Endpoint:** `/api/v11/spotlight`
- **Access:** Public
- **Query Parameters:** `sectionTag` (optional, default: `festive_spotlight`)
- **Response:** `200 OK`
```json
{
  "statusCode": 200,
  "data": [
    {
      "_id": "66cf01...",
      "eyebrow": "FESTIVE EDITORIAL 2026",
      "title": "Raw Silk Zari Kurta with Organza Dupatta",
      "description": "Crafted from pure 80-gram raw silk with intricate antique kora-dabka neckline hand embroidery, paired with a laser-cut organza dupatta with scalloped borders.",
      "price": 12500,
      "currency": "PKR",
      "dispatchBadge": "✓ Ready to Dispatch in 24h",
      "hotspot": {
        "text": "✨ Shop The Model's Kurta",
        "posX": 35,
        "posY": 42
      },
      "image": {
        "url": "https://res.cloudinary.com/...",
        "public_id": "clothing_store/spotlight/..."
      },
      "primaryCta": {
        "text": "SHOP THIS COMPLETE OUTFIT",
        "link": "/products/66ce381a..."
      },
      "secondaryCta": {
        "text": "VIEW FULL LOOKBOOK",
        "link": "/lookbook/festive-2026"
      },
      "linkedProduct": {
        "_id": "66ce381a...",
        "title": "Raw Silk Zari Kurta",
        "price": 12500,
        "stock": 18
      },
      "isActive": true
    }
  ]
}
```

---

### 11.2 Unified Homepage Data Aggregation (Public - All in 1 Fast Call)
- **Method:** `GET`
- **Endpoint:** `/api/v11/spotlight/homepage`
- **Access:** Public
- **Response:** `200 OK`
```json
{
  "statusCode": 200,
  "data": {
    "heroBanners": [ /* Active Banners Array */ ],
    "wardrobeCategories": {
      "eyebrow": "THE ATELIER COLLECTIONS",
      "heading": "Curated by Wardrobe Category",
      "subtext": "From daily breathable cambrics to exquisite raw silk festive bridals",
      "categories": [
        {
          "name": "Ready to Wear",
          "subtitle": "PRET, CO-ORDS & KURTAS",
          "slug": "ready-to-wear",
          "productCount": 28,
          "image": { "url": "https://res.cloudinary.com/..." }
        }
      ]
    },
    "topSellingApparel": {
      "eyebrow": "🔥 HOT DEALS & HIGH DEMAND",
      "heading": "Top Selling Apparel",
      "fabricFilters": [
        "ALL FABRICS",
        "CAMBRIC",
        "LUXURY LAWN",
        "RAW SILK",
        "PURE CHIFFON",
        "WOVEN JACQUARD",
        "LINEN & COTTON"
      ],
      "products": [
        {
          "title": "Short Floral Kurta",
          "price": 4500,
          "discountPrice": 3850,
          "discountPercent": 14,
          "computedBadge": "-14% OFF",
          "productTypeTag": "PRINTED | CAMBRIC",
          "coverImage": { "url": "..." },
          "hoverImage": { "url": "..." }
        }
      ]
    },
    "editorialSpotlight": {
      "eyebrow": "FESTIVE EDITORIAL 2026",
      "title": "Raw Silk Zari Kurta with Organza Dupatta",
      "price": 12500,
      "dispatchBadge": "✓ Ready to Dispatch in 24h",
      "hotspot": { "text": "✨ Shop The Model's Kurta", "posX": 35, "posY": 42 },
      "primaryCta": { "text": "SHOP THIS COMPLETE OUTFIT", "link": "/products/..." }
    }
  }
}
```

---

### 11.3 Admin All Spotlights List
- **Method:** `GET`
- **Endpoint:** `/api/v11/spotlight/admin/all`
- **Access:** `Admin`
- **Query Parameters:** `search`, `isActive`

---

### 11.4 Create Editorial Spotlight (Admin Only)
- **Method:** `POST`
- **Endpoint:** `/api/v11/spotlight/create`
- **Access:** `Admin`
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `image` (file, required)
  - `title` (string, required)
  - `eyebrow` (string, e.g. "FESTIVE EDITORIAL 2026")
  - `description` (string)
  - `price` (number, e.g. 12500)
  - `currency` (string, default "PKR")
  - `dispatchBadge` (string, default "✓ Ready to Dispatch in 24h")
  - `hotspotText` (string, default "✨ Shop The Model's Kurta")
  - `hotspotPosX` (number, % from left 0-100)
  - `hotspotPosY` (number, % from top 0-100)
  - `primaryCtaText` (string, e.g. "SHOP THIS COMPLETE OUTFIT")
  - `primaryCtaLink` (string)
  - `secondaryCtaText` (string, e.g. "VIEW FULL LOOKBOOK")
  - `secondaryCtaLink` (string)
  - `linkedProduct` (product ObjectId)
  - `priority` (number)

---

### 11.5 Update Editorial Spotlight (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v11/spotlight/:spotlightid/update`
- **Access:** `Admin`
- **Content-Type:** `multipart/form-data` or `application/json`
- **Form Fields:** Any fields from 11.4, optional new `image` file.

---

### 11.6 1-Click Toggle Active Spotlight (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v11/spotlight/:spotlightid/toggle-active`
- **Access:** `Admin`

---

### 11.7 Delete Editorial Spotlight (Admin Only)
- **Method:** `DELETE`
- **Endpoint:** `/api/v11/spotlight/:spotlightid/delete`
- **Access:** `Admin`

---

## 12. Cloudinary Cloud Media & CDN Transformations Guide

The platform integrates a zero-disk-footprint, high-performance Cloudinary CDN pipeline tailored specifically for luxury clothing, fabric inspection, fast catalog rendering, and magazine-quality campaigns.

---

### 12.1 Cloudinary Architecture & Environment Variables
Add your Cloudinary API keys to your `.env` file:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### How Uploads Work:
1. **Memory Storage**: Multer buffers uploaded files directly in memory (`Buffer`) with zero temporary files on local disk.
2. **Buffer Streaming (`streamifier`)**: Images stream concurrently directly to Cloudinary using `upload_stream`.
3. **Automatic Eager Generation**: Cloudinary creates optimized 4:5 fashion thumbnails and high-res zoom versions on upload.
4. **Permanent Safe Cleanup**: Deleting any product, category, banner, or review automatically deletes the corresponding asset from Cloudinary.

---

### 12.2 Fashion E-Commerce Image Transformations

| Target Use Case | Dimensions & Ratio | Gravity / Crop | Quality & Format | Resulting Key |
|---|---|---|---|---|
| **Product Grid Cards** | `400 x 500` (4:5 Portrait) | `crop: "fill"`, `gravity: "auto"` | `q_auto:good`, `f_auto` (WebP/AVIF) | `thumbnailUrl` |
| **High-Res Fabric Zoom** | `1200 x 1500` (4:5 High-Def) | `crop: "limit"` | `q_auto:best`, `f_auto` | `highResUrl` / `url` |
| **Desktop Hero Banner** | `1920 x 800` (Ultra-wide) | `crop: "fill"`, `gravity: "auto"` | `q_auto:best`, `f_auto` | `bannerOptimizedUrl` |
| **Mobile Hero Banner** | `800 x 800` (1:1 Square) | `crop: "fill"`, `gravity: "auto"` | `q_auto:good`, `f_auto` | `mobileBannerUrl` |
| **User Profile Avatars**| `300 x 300` (Square) | `crop: "thumb"`, `gravity: "face"` | `q_auto:good`, `f_auto` | `avatar` |
| **Lookbook Spotlight** | `1000 x 1250` (Editorial) | `crop: "fill"`, `gravity: "auto"` | `q_auto:best`, `f_auto` | `image.url` |

---

### 12.3 Cloudinary Folder Organization
Assets are structured into clean, segregated namespaces:
```
clothing_store/
├── products/       ➔ Multi-image product galleries (cover, hover, detailed shots)
├── categories/     ➔ Wardrobe category banner cards and icons
├── banners/        ➔ Ultra-wide desktop and mobile hero campaign banners
├── spotlight/      ➔ High-fashion editorial lookbook campaign photos
├── avatars/        ➔ User and admin profile pictures (face-centered)
└── reviews/        ➔ Customer-submitted review proof photos
```

---

### 12.4 Dynamic On-The-Fly CDN URLs for Frontend Developers

Frontend applications can transform any Cloudinary URL on-the-fly by altering path parameters:

#### Example 1: Instant Low-Quality Blur Placeholder (LQIP for Lazy Loading)
```
https://res.cloudinary.com/<CLOUD_NAME>/image/upload/w_50,e_blur:1000,q_1,f_auto/<PUBLIC_ID>
```

#### Example 2: Responsive Width for Mobile Screens (Width 400px, Auto WebP)
```
https://res.cloudinary.com/<CLOUD_NAME>/image/upload/w_400,c_fill,g_auto,q_auto,f_auto/<PUBLIC_ID>
```

#### Example 3: Circular User Avatar with Face Auto-Detection
```
https://res.cloudinary.com/<CLOUD_NAME>/image/upload/w_200,h_200,c_thumb,g_face,r_max,f_auto/<PUBLIC_ID>
```

#### Example 4: High-Def Desktop Hero Banner (1920px wide)
```
https://res.cloudinary.com/<CLOUD_NAME>/image/upload/w_1920,h_800,c_fill,g_auto,q_auto:best,f_auto/<PUBLIC_ID>
```

---

## 13. System Health Check (`/api/health`)

- **Method:** `GET`
- **Endpoint:** `/api/health`
- **Access:** Public
- **Response:** `200 OK`
```json
{
  "status": "OK",
  "timestamp": "2026-08-28T14:35:00.000Z",
  "database": "connected"
}
```



---

## 🔑 Google OAuth 2.0 Setup Guide

To enable Google Sign-In on your backend and frontend:

### Step 1: Create Google Cloud OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `Clothing-Store-Auth`).
3. Navigate to **APIs & Services** > **OAuth Consent Screen**:
   - User Type: **External**
   - App Name: `Your Store Name`
   - User Support Email: your email
4. Navigate to **APIs & Services** > **Credentials**:
   - Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
   - Application type: **Web application**.
   - Name: `Clothing Store Frontend & Backend`.
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (Vite frontend)
     - `http://localhost:3000` (Next.js frontend)
     - `https://your-production-domain.com`
5. Copy your **Client ID** and **Client Secret**.

### Step 2: Add to Backend `.env`
Add the following keys into your `.env` file:
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

### Step 3: Frontend Integration (React / Next.js / Vue)
Using `@react-oauth/google` or Google One-Tap:
```javascript
import { GoogleLogin } from '@react-oauth/google';

<GoogleLogin
  onSuccess={async (credentialResponse) => {
    // Send the credential / idToken to backend
    const res = await fetch('http://localhost:4000/api/v1/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        credential: credentialResponse.credential,
      }),
    });
    const data = await res.json();
    console.log('Logged in user:', data.data);
  }}
  onError={() => console.error('Login Failed')}
/>
```

---

## ⚡ Socket.io Real-Time Events

### 📡 Event Summary Table:
| Event Name | Direction | Room | Payload Description |
|---|---|---|---|
| `join_admin_room` | Client ➔ Server | `admin_room` | Subscribes Admin to live store order broadcasts |
| `join_user_room` | Client ➔ Server | `user_${id}` | Subscribes Customer to personal order tracking updates |
| `new_order` | Server ➔ Admin Client | `admin_room` | Triggered on every new order with customer name and total |
| `order_status_updated` | Server ➔ Customer Client | `user_${id}` | Triggered when admin changes order status (`shipped`, `delivered`, etc.) |
| `admin_order_updated` | Server ➔ Admin Client | `admin_room` | Triggered when order status or payment is updated |

---

### 🔔 Event Payloads:

#### 1. `new_order` (Emitted to Admin)
```json
{
  "orderId": "66ce381a9f1b2c0012345678",
  "totalAmount": 149.99,
  "customerName": "Jane Smith",
  "customerEmail": "jane@example.com",
  "itemsCount": 2,
  "createdAt": "2026-08-29T12:00:00.000Z"
}
```

#### 2. `order_status_updated` (Emitted to Customer)
```json
{
  "orderId": "66ce381a9f1b2c0012345678",
  "status": "shipped",
  "paymentStatus": "paid",
  "updatedAt": "2026-08-29T12:30:00.000Z"
}
```

#### 3. `admin_order_updated` (Emitted to Admin Room)
```json
{
  "orderId": "66ce381a9f1b2c0012345678",
  "status": "shipped",
  "paymentStatus": "paid",
  "customerName": "Jane Smith"
}
```


