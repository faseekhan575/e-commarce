# 👑 Haute Couture Luxury E-Commerce Platform — Complete API & Real-Time Notification Master Specification

**Document Version:** 11.0 (Enterprise Production Master)  
**Target Audience:** AI Agents, Full-Stack Engineers, System Architects, API Developers  
**Backend Environment:** Node.js 20+, Express.js 4.x, MongoDB 7.x (Mongoose), Socket.IO 4.x, Cloudinary SDK  
**Frontend Environment:** React 19, Vite, Redux Toolkit 2.x, TailwindCSS v4  
**Local Base URL:** `http://localhost:4000`  
**Production Gateway:** Configurable via `process.env.PORT` and CORS whitelist  
**Authentication Standard:** Dual-Tier (HTTP-Only Secure SameSite Cookies + Bearer JWT in `Authorization` Header)

---

## 📑 Complete Table of Contents
1. [System Architecture & Global Communication Standards](#1-system-architecture--global-communication-standards)
2. [End-to-End Product Flow Architecture (Navigation to Database)](#2-end-to-end-product-flow-architecture)
3. [Left-Side Filter Sidebar & State Management Architecture](#3-left-side-filter-sidebar--state-management-architecture)
4. [Socket.IO Real-Time Notification & Event Matrix](#4-socketio-real-time-notification--event-matrix)
5. [Module 1: Authentication & Session APIs (`/api/v1/auth`)](#module-1-authentication--session-apis-apiv1auth)
6. [Module 2: Customer Profile APIs (`/api/v2/user`)](#module-2-customer-profile-apis-apiv2user)
7. [Module 3: Product & Inventory Catalog APIs (`/api/v3/product`)](#module-3-product--inventory-catalog-apis-apiv3product)
8. [Module 4: Luxury Categories & Taxonomy APIs (`/api/v4/category`)](#module-4-luxury-categories--taxonomy-apis-apiv4category)
9. [Module 5: Shopping Cart APIs (`/api/v5/cart`)](#module-5-shopping-cart-apis-apiv5cart)
10. [Module 6: Order Processing & Courier Tracking APIs (`/api/v6/order`)](#module-6-order-processing--courier-tracking-apis-apiv6order)
11. [Module 7: Customer Reviews & Ratings APIs (`/api/v7/review`)](#module-7-customer-reviews--ratings-apis-apiv7review)
12. [Module 8: Customer CRM & Admin Management APIs (`/api/v8/admin`)](#module-8-customer-crm--admin-management-apis-apiv8admin)
13. [Module 9: Executive Dashboard & Analytics APIs (`/api/v9/dashboard`)](#module-9-executive-dashboard--analytics-apis-apiv9dashboard)
14. [Module 10: Luxury Banner Slider & Hero APIs (`/api/v10/banner`)](#module-10-luxury-banner-slider--hero-apis-apiv10banner)
15. [Module 11: Editorial Lookbook & Spotlight APIs (`/api/v11/spotlight`)](#module-11-editorial-lookbook--spotlight-apis-apiv11spotlight)
16. [Module 12: System Health & Diagnostics (`/api/health`)](#module-12-system-health--diagnostics-apihealth)

---

## 1. System Architecture & Global Communication Standards

### 1.1 HTTP Headers & Authorization Protocol
All secured endpoints expect the JWT token via either:
1. **HTTP Authorization Header (Recommended for Mobile/SPA):**
   ```http
   Authorization: Bearer <JWT_ACCESS_TOKEN>
   ```
2. **HTTP-Only Cookie:**
   `accessToken=<JWT_ACCESS_TOKEN>; Path=/; HttpOnly; SameSite=None; Secure`

### 1.2 Standard Success Response Envelope (`ApiResponse`)
Every successful JSON response conforms to the standard `ApiResponse` structure:
```json
{
  "statusCode": 200,
  "data": {},
  "message": "Operation completed successfully",
  "success": true
}
```

### 1.3 Standard Error Response Envelope (`ApiError`)
All caught errors conform to the standard error contract:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Descriptive human-readable error explanation",
  "errors": []
}
```

---

## 2. End-to-End Product Flow Architecture

### Sequence: User Clicks "Products" to Live Render
```
[User Clicks "Products" or Category]
         │
         ▼
[React Router (/products)]
         │
         ▼
[Redux Toolkit: dispatch(fetchProducts(query))]
         │
         ├──► GET http://localhost:4000/api/v3/product?page=1&limit=100
         │
         ▼
[Express Router: productRouter.route("/").get(getAllProducts)]
         │
         ▼
[Controller: product.controller.js -> getAllProducts]
         │   • Parses req.query (category, search, minPrice, maxPrice, fabric, sort, inStock)
         │   • Builds MongoDB Query: { isActive: true, category: ..., fabric: ... }
         │   • Populates: category (name, slug, image), createdBy (fullname, email)
         │   • Executes Promise.all([Product.find(), Product.countDocuments()])
         │
         ▼
[Response Serialization: ApiResponse(200, { products, totalProducts, currentPage, totalPages })]
         │
         ▼
[Redux Store: productsSlice.js -> extraReducers: fetchProducts.fulfilled]
         │   • state.items = action.payload.products
         │   • state.total = action.payload.totalProducts
         │   • state.page = action.payload.currentPage
         │   • state.loading = false
         │   • NO localStorage dependency — 100% reactive state
         │
         ▼
[React ProductsPage Component Re-Renders]
         │
         ├──► Left Sidebar: Interactive Filters (Categories, Price Slider, Fabrics, Sizes XS-XXL, In-Stock)
         ├──► Main Content: Active Filter Pills, Results Counter ("Showing 101 luxury outfits")
         └──► Product Grid: High-fashion cards with Quick View, Size Guide, Image Zoom, Add to Cart Drawer
```

---

## 3. Left-Side Filter Sidebar & State Management Architecture

The left-side filter sidebar is fully reactive and synchronized with the Redux Toolkit store and URL search parameters.

| Filter Section | Type | Controlled State | Backend Query Parameter | Behavior / Options |
|---|---|---|---|---|
| **Search Bar** | Text Input | `searchQuery` | `search` | Real-time debounce (300ms) matches title, description, tags |
| **Categories** | Radio / Pill | `selectedCategory` | `category` | Fetched live from `/api/v4/category`. Displays dynamic product count per category |
| **Price Slider** | Range Slider | `priceRange` | `minPrice`, `maxPrice` | Min Rs. 0 to Max Rs. 100,000 + Luxury Presets (Under 10k, 10k-25k, 25k-50k, 50k+) |
| **Fabric Type** | Badges / Tags | `selectedFabric` | `fabric` | Cambric, Luxury Lawn, Raw Silk, Pure Chiffon, Woven Jacquard, Linen Cotton, Velvet |
| **Size Matrix** | Button Matrix | `selectedSizes` | Client-side filter | XS, S, M, L, XL, XXL (Filters products having available size in `sizeVariants`) |
| **Stitching Type** | Segmented | `stitchingType` | Client-side filter | All, Unstitched, Stitched / Ready-to-Wear |
| **Availability** | Toggle Switch | `inStockOnly` | `inStock=true` | Hides sold-out inventory (`stock > 0`) |
| **Sort Order** | Dropdown | `sortBy` | `sort` | `newest`, `price-asc`, `price-desc`, `popular`, `rating` |

---

## 4. Socket.IO Real-Time Notification & Event Matrix

Socket.IO is mounted at the root HTTP server and handles bidirectional real-time synchronization.

### 4.1 Client Connection & Room Subscriptions
```javascript
import { io } from "socket.io-client";
const socket = io("http://localhost:4000", { withCredentials: true });

// Admin connects & joins the store broadcast room:
socket.emit("join_admin_room");

// Logged-in customer connects & joins private tracking room:
socket.emit("join_user_room", currentUserId);
```

### 4.2 Socket Notification Events

| Event Name | Emitter Trigger | Target Room | Payload Structure | UI Notification Effect |
|---|---|---|---|---|
| `new_user_registered` | `POST /api/v1/auth/register` | `admin_room` | `{ userId, fullname, email, role }` | Admin dashboard toast & sound alert for new customer acquisition |
| `new_order` | `POST /api/v6/order/place` | `admin_room` | `{ orderId, totalAmount, customerName, customerEmail, itemsCount, createdAt }` | Instant sound chime, Live Orders counter increment, flashing badge |
| `low_stock` | `POST /api/v6/order/place` (when item stock <= 5) | `admin_room` | `{ productId, title, stock }` | Urgent red inventory alert banner in Admin Dashboard |
| `order_status_updated` | `PATCH /api/v6/order/:id/status` & `tracking` | `user_<userId>` | `{ orderId, status, paymentStatus, trackingNumber, courier, trackingUrl, timeline, updatedAt }` | Instant push notification to customer on tracking page and account |
| `admin_order_updated` | `PATCH /api/v6/order/:id/status` & `tracking` | `admin_room` | `{ orderId, status, paymentStatus, trackingNumber, customerName }` | Admin Live Orders table row updates in real-time without page reload |
| `new_review` | `POST /api/v7/review/:id/add` | `admin_room` | `{ reviewId, productId, rating, comment }` | Admin review moderation badge alert |

---

## Module 1: Authentication & Session APIs (`/api/v1/auth`)

### 1.1 Register New Customer
- **Endpoint:** `POST /api/v1/auth/register`
- **Access:** Public
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "username": "ayesha_khan",
    "email": "ayesha@example.com",
    "fullname": "Ayesha Khan",
    "password": "Password123!"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "statusCode": 201,
    "data": {
      "user": {
        "_id": "6a90fa12b489c7d0012e4321",
        "username": "ayesha_khan",
        "email": "ayesha@example.com",
        "fullname": "Ayesha Khan",
        "role": "user",
        "isVerified": false,
        "createdAt": "2026-09-10T12:00:00.000Z"
      }
    },
    "message": "User registered successfully. Please verify your OTP sent to email",
    "success": true
  }
  ```
- **Socket Notification Emitted:**
  - Event: `new_user_registered` to `admin_room`
  - Payload: `{ userId: "6a90fa...", fullname: "Ayesha Khan", email: "ayesha@example.com", role: "user" }`

---

### 1.2 Verify Email OTP
- **Endpoint:** `POST /api/v1/auth/verify-otp`
- **Access:** Public
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "ayesha@example.com",
    "otp": "847291"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {
      "user": {
        "_id": "6a90fa12b489c7d0012e4321",
        "username": "ayesha_khan",
        "email": "ayesha@example.com",
        "fullname": "Ayesha Khan",
        "role": "user",
        "isVerified": true
      },
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "message": "Account verified successfully",
    "success": true
  }
  ```
- **Cookies Set:** `accessToken` (1 day), `refreshToken` (10 days) with `HttpOnly; Secure; SameSite=None`.

---

### 1.3 Resend Verification OTP
- **Endpoint:** `POST /api/v1/auth/resend-otp`
- **Access:** Public
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "ayesha@example.com"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {},
    "message": "Verification OTP resent successfully",
    "success": true
  }
  ```

---

### 1.4 Customer & Admin Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Access:** Public
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "ayesha@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {
      "user": {
        "_id": "6a90fa12b489c7d0012e4321",
        "username": "ayesha_khan",
        "email": "ayesha@example.com",
        "fullname": "Ayesha Khan",
        "role": "user",
        "isVerified": true,
        "avatar": { "url": "https://res.cloudinary.com/..." }
      },
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "message": "Login successful",
    "success": true
  }
  ```

---

### 1.5 Refresh Session Token
- **Endpoint:** `POST /api/v1/auth/refresh-token`
- **Access:** Public (Requires valid Refresh Token in Cookie or Body)
- **Request Body (Optional if Cookie present):**
  ```json
  {
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "message": "Access token refreshed successfully",
    "success": true
  }
  ```

---

### 1.6 Forgot Password Request
- **Endpoint:** `POST /api/v1/auth/forgot-password`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "ayesha@example.com"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {},
    "message": "Password reset OTP sent to your email",
    "success": true
  }
  ```

---

### 1.7 Reset Password with OTP
- **Endpoint:** `POST /api/v1/auth/reset-password`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "ayesha@example.com",
    "otp": "912384",
    "newPassword": "NewLuxuryPassword2026!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {},
    "message": "Password reset successfully. You can now login with your new password",
    "success": true
  }
  ```

---

### 1.8 Get Current Logged-In User Profile
- **Endpoint:** `GET /api/v1/auth/me`
- **Access:** Protected (User / Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {
      "user": {
        "_id": "6a90fa12b489c7d0012e4321",
        "username": "ayesha_khan",
        "email": "ayesha@example.com",
        "fullname": "Ayesha Khan",
        "role": "user",
        "isVerified": true,
        "avatar": { "url": "https://res.cloudinary.com/...", "public_id": "clothing_store/avatars/avatar_1" }
      }
    },
    "message": "Current user profile fetched",
    "success": true
  }
  ```

---

### 1.9 Logout User
- **Endpoint:** `POST /api/v1/auth/logout`
- **Access:** Protected (User / Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {},
    "message": "Logged out successfully",
    "success": true
  }
  ```
- **Cookies Cleared:** `accessToken`, `refreshToken`

---

## Module 2: Customer Profile APIs (`/api/v2/user`)

### 2.1 Get Detailed User Profile
- **Endpoint:** `GET /api/v2/user/profile`
- **Access:** Protected (User / Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {
      "_id": "6a90fa12b489c7d0012e4321",
      "username": "ayesha_khan",
      "email": "ayesha@example.com",
      "fullname": "Ayesha Khan",
      "role": "user",
      "isVerified": true,
      "avatar": { "url": "https://res.cloudinary.com/..." },
      "createdAt": "2026-09-10T12:00:00.000Z",
      "updatedAt": "2026-09-10T12:00:00.000Z"
    },
    "message": "Profile fetched successfully",
    "success": true
  }
  ```

---

### 2.2 Update Profile Information
- **Endpoint:** `PATCH /api/v2/user/profile/update`
- **Access:** Protected (User / Admin)
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <accessToken>`
- **Request Body:**
  ```json
  {
    "fullname": "Ayesha Khan Lodhi",
    "username": "ayesha_lodhi"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {
      "_id": "6a90fa12b489c7d0012e4321",
      "username": "ayesha_lodhi",
      "email": "ayesha@example.com",
      "fullname": "Ayesha Khan Lodhi",
      "role": "user"
    },
    "message": "Profile updated successfully",
    "success": true
  }
  ```

---

### 2.3 Upload or Update Avatar Image
- **Endpoint:** `PATCH /api/v2/user/avatar`
- **Access:** Protected (User / Admin)
- **Headers:** `Content-Type: multipart/form-data`, `Authorization: Bearer <accessToken>`
- **Request Form Data:**
  - `avatar` (File binary: png, jpg, webp)
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {
      "avatar": {
        "url": "https://res.cloudinary.com/dyvgp04/image/upload/v1726000000/clothing_store/avatars/avatar_6a90.webp",
        "public_id": "clothing_store/avatars/avatar_6a90"
      }
    },
    "message": "Avatar updated successfully",
    "success": true
  }
  ```

---

### 2.4 Change Password
- **Endpoint:** `PATCH /api/v2/user/password`
- **Access:** Protected (User / Admin)
- **Request Body:**
  ```json
  {
    "oldPassword": "Password123!",
    "newPassword": "BrandNewPassword2026#"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {},
    "message": "Password changed successfully",
    "success": true
  }
  ```

---

### 2.5 Delete Customer Account
- **Endpoint:** `DELETE /api/v2/user/delete`
- **Access:** Protected
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {},
    "message": "Account deleted successfully",
    "success": true
  }
  ```

---

## Module 3: Product & Inventory Catalog APIs (`/api/v3/product`)

### 3.1 Get All Active Products (Catalog with Dynamic Filters)
- **Endpoint:** `GET /api/v3/product` or `GET /api/v3/product/all`
- **Access:** Public
- **Query Parameters:**
  | Parameter | Type | Required | Default | Description / Valid Values |
  |---|---|---|---|---|
  | `page` | Number | No | `1` | Page number for pagination |
  | `limit` | Number | No | `12` | Items per page |
  | `category` | String | No | - | Category ObjectId (e.g. `6a90f...`) or slug (`ready-to-wear`) |
  | `search` | String | No | - | Regex search across `title`, `description`, and `tags` |
  | `fabric` | String | No | - | Fabric name (e.g. `Cambric`, `Luxury Lawn`, `Raw Silk`, `Chiffon`) |
  | `minPrice` | Number | No | - | Minimum price threshold in PKR |
  | `maxPrice` | Number | No | - | Maximum price threshold in PKR |
  | `inStock` | Boolean | No | - | `true` to filter only items where `stock > 0` |
  | `isHot` | Boolean | No | - | `true` to filter trending items |
  | `isFeatured` | Boolean | No | - | `true` to filter featured showcase items |
  | `sort` | String | No | `newest` | `newest`, `price-asc`, `price-desc`, `popular`, `rating` |
- **Example Request:**
  `GET http://localhost:4000/api/v3/product?category=ready-to-wear&fabric=Cambric&minPrice=5000&maxPrice=25000&inStock=true&sort=price-asc&page=1&limit=12`
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {
      "products": [
        {
          "_id": "6a92b448f316247e015451ba",
          "title": "Embroidered Cambric Kurta & Trouser Set",
          "description": "Exquisitely detailed 2-piece ready-to-wear outfit crafted on premium lightweight cambric with delicate thread embroidery.",
          "price": 9500,
          "discountPrice": 7990,
          "costPrice": 4200,
          "sku": "RTW-CAM-001",
          "fabric": "Cambric",
          "fabricType": "Cambric",
          "productTypeTag": "2 Piece",
          "piecesCount": 2,
          "stitchingType": "stitched",
          "stock": 35,
          "isHot": true,
          "isFeatured": true,
          "isActive": true,
          "customBadge": "Best Seller",
          "dispatchBadge": "Ready for Dispatch (24-48 Hours)",
          "images": [
            {
              "url": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85",
              "public_id": "clothing_store/prod_1_1",
              "isDefault": true,
              "isHover": false
            },
            {
              "url": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85",
              "public_id": "clothing_store/prod_1_2",
              "isDefault": false,
              "isHover": true
            }
          ],
          "sizes": ["XS", "S", "M", "L", "XL"],
          "sizeVariants": [
            { "size": "XS", "stock": 5, "isAvailable": true },
            { "size": "S", "stock": 10, "isAvailable": true },
            { "size": "M", "stock": 12, "isAvailable": true },
            { "size": "L", "stock": 5, "isAvailable": true },
            { "size": "XL", "stock": 3, "isAvailable": true }
          ],
          "category": {
            "_id": "6a90f111a123b456789c0001",
            "name": "Ready to Wear",
            "slug": "ready-to-wear",
            "subtitle": "PRET, CO-ORDS & LUXURY KURTAS"
          },
          "analytics": {
            "views": 320,
            "purchased": 48
          },
          "createdAt": "2026-09-08T10:00:00.000Z"
        }
      ],
      "totalProducts": 101,
      "currentPage": 1,
      "totalPages": 9
    },
    "message": "Products fetched successfully",
    "success": true
  }
  ```

---

### 3.2 Get Hot & Featured Products (Hero & Frontpage Showcases)
- **Endpoint:** `GET /api/v3/product/hot`
- **Access:** Public
- **Query Parameters:** `limit` (default `8`)
- **Response (200 OK):** Returns array of products where `isHot: true` or `isFeatured: true`.

---

### 3.3 Get Top Selling Luxury Apparel (with Fabric Tab Filter)
- **Endpoint:** `GET /api/v3/product/top-selling`
- **Access:** Public
- **Query Parameters:** `limit` (default `8`), `fabric` (e.g. `Cambric`, `Raw Silk`, `Lawn`, `All`)
- **Response (200 OK):** Returns top-performing outfits sorted by `analytics.purchased` descending.

---

### 3.4 Get Available Fabric Pills List
- **Endpoint:** `GET /api/v3/product/fabrics`
- **Access:** Public
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": [
      "All Fabrics",
      "Cambric",
      "Luxury Lawn",
      "Raw Silk",
      "Pure Chiffon",
      "Woven Jacquard",
      "Linen & Cotton",
      "Velvet"
    ],
    "message": "Available fabrics fetched successfully",
    "success": true
  }
  ```

---

### 3.5 Create Product (Admin Only)
- **Endpoint:** `POST /api/v3/product/create`
- **Access:** Protected (Admin Only)
- **Headers:** `Content-Type: multipart/form-data`, `Authorization: Bearer <accessToken>`
- **Form Data Fields:**
  - `title` (String, e.g. "Festive Gold Embroidered Silk Anarkali")
  - `description` (String)
  - `category` (String, Category ObjectId)
  - `price` (Number, e.g. 18500)
  - `discountPrice` (Number, e.g. 14999)
  - `costPrice` (Number, e.g. 8000)
  - `sku` (String, e.g. "FEST-SLK-009")
  - `fabric` (String, e.g. "Raw Silk")
  - `fabricType` (String, e.g. "Raw Silk")
  - `piecesCount` (Number, e.g. 3)
  - `stitchingType` (String: "stitched" | "unstitched")
  - `stock` (Number, e.g. 50)
  - `sizes` (JSON String or Comma-separated: `["XS","S","M","L","XL"]`)
  - `sizeVariants` (JSON String: `[{"size":"S","stock":10},{"size":"M","stock":20}]`)
  - `customBadge` (String: "Exclusive 2026")
  - `dispatchBadge` (String: "Dispatch 24h")
  - `isHot` (Boolean: true)
  - `isFeatured` (Boolean: true)
  - `images` or `image` (Multiple file uploads: Up to 10 photos)
- **Response (201 Created):**
  ```json
  {
    "statusCode": 201,
    "data": {
      "_id": "6a92b999f316247e01549999",
      "title": "Festive Gold Embroidered Silk Anarkali",
      "price": 18500,
      "images": [{ "url": "https://res.cloudinary.com/...", "public_id": "...", "isDefault": true }],
      "stock": 50,
      "createdAt": "2026-09-10T12:00:00.000Z"
    },
    "message": "Product created successfully",
    "success": true
  }
  ```

---

### 3.6 Get Admin Products Inventory
- **Endpoint:** `GET /api/v3/product/admin/all`
- **Access:** Protected (Admin Only)
- **Query Parameters:** `page`, `limit`, `search`, `category`, `stockStatus` (`all`, `low`, `out`), `isHot`
- **Response (200 OK):** Complete inventory listing including inactive items, cost price, and gross profit metrics.

---

### 3.7 Get Low Stock & Out of Stock Alerts
- **Endpoint:** `GET /api/v3/product/admin/low-stock`
- **Access:** Protected (Admin Only)
- **Query Parameters:** `threshold` (Default `5`)
- **Response (200 OK):** Products with total stock <= threshold or size variant stock <= 2.

---

### 3.8 Get Single Product Details
- **Endpoint:** `GET /api/v3/product/:productid`
- **Access:** Public
- **Behavior:** Automatically increments `analytics.views` by 1 in MongoDB.
- **Response (200 OK):** Populated product object with related category, sizes, color variants, and image gallery.

---

### 3.9 Update Product Details
- **Endpoint:** `PATCH /api/v3/product/:productid/update`
- **Access:** Protected (Admin Only)
- **Headers:** `Content-Type: multipart/form-data` or `application/json`, `Authorization: Bearer <accessToken>`
- **Response (200 OK):** Updated product document.

---

### 3.10 Quick Stock Level Update
- **Endpoint:** `PATCH /api/v3/product/:productid/stock`
- **Access:** Protected (Admin Only)
- **Request Body:** `{ "stock": 45 }`
- **Response (200 OK):** `{ "statusCode": 200, "data": { "_id": "...", "stock": 45 }, "message": "Product stock updated successfully" }`

---

### 3.11 Toggle Hot / Featured Flag
- **Endpoint:** `PATCH /api/v3/product/:productid/toggle-hot`
- **Access:** Protected (Admin Only)
- **Response (200 OK):** Toggles `isHot` boolean and returns updated status.

---

### 3.12 Toggle Size Availability (1-Click)
- **Endpoint:** `PATCH /api/v3/product/:productid/toggle-size`
- **Access:** Protected (Admin Only)
- **Request Body:** `{ "size": "XL" }`
- **Response (200 OK):** Toggles `isAvailable` for the specified size variant.

---

### 3.13 Update Size Stock
- **Endpoint:** `PATCH /api/v3/product/:productid/size-stock`
- **Access:** Protected (Admin Only)
- **Request Body:** `{ "size": "M", "stock": 25 }`
- **Response (200 OK):** Updates stock for the specific size and synchronizes overall product stock.

---

### 3.14 Delete Product
- **Endpoint:** `DELETE /api/v3/product/:productid/delete`
- **Access:** Protected (Admin Only)
- **Behavior:** Deletes product from database and removes all uploaded images from Cloudinary storage.
- **Response (200 OK):** `{ "statusCode": 200, "message": "Product and associated images deleted successfully" }`

---

### 3.15 Product Performance Analytics
- **Endpoint:** `GET /api/v3/product/:productid/analytics`
- **Access:** Protected (Admin Only)
- **Response (200 OK):** Total views, total units purchased, conversion rate %, total revenue generated, gross profit.

---

### 3.16 Add Additional Product Image(s)
- **Endpoint:** `POST /api/v3/product/:productid/image/add`
- **Access:** Protected (Admin Only)
- **Headers:** `Content-Type: multipart/form-data`
- **Body:** `images` (Up to 10 files)
- **Response (200 OK):** Returns updated images array.

---

### 3.17 Set Default Cover Image
- **Endpoint:** `PATCH /api/v3/product/:productid/image/set-default`
- **Access:** Protected (Admin Only)
- **Request Body:** `{ "public_id": "clothing_store/prod_1_1" }`
- **Response (200 OK):** Sets target image as primary thumbnail.

---

### 3.18 Set Hover Image
- **Endpoint:** `PATCH /api/v3/product/:productid/image/set-hover`
- **Access:** Protected (Admin Only)
- **Request Body:** `{ "public_id": "clothing_store/prod_1_2" }`
- **Response (200 OK):** Sets target image as hover preview on collection cards.

---

### 3.19 Reorder Product Images
- **Endpoint:** `PATCH /api/v3/product/:productid/image/reorder`
- **Access:** Protected (Admin Only)
- **Request Body:** `{ "imageOrder": ["public_id_2", "public_id_1", "public_id_3"] }`
- **Response (200 OK):** Reordered images array.

---

### 3.20 Delete Single Product Image
- **Endpoint:** `DELETE /api/v3/product/:productid/image/delete`
- **Access:** Protected (Admin Only)
- **Request Body:** `{ "public_id": "clothing_store/prod_1_2" }`
- **Response (200 OK):** Removes image from Cloudinary and product gallery.

---

## Module 4: Luxury Categories & Taxonomy APIs (`/api/v4/category`)

### 4.1 Get All Categories (with Dynamic Product Counts)
- **Endpoint:** `GET /api/v4/category` or `GET /api/v4/category/all`
- **Access:** Public
- **Query Parameters:** `isHot` (Boolean), `isFeatured` (Boolean)
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": [
      {
        "_id": "6a90f111a123b456789c0001",
        "name": "Ready to Wear",
        "slug": "ready-to-wear",
        "subtitle": "PRET, CO-ORDS & LUXURY KURTAS",
        "eyebrow": "AUTUMN / WINTER 2026",
        "description": "Tailored to perfection with intricate stitching and contemporary silhouettes.",
        "image": {
          "url": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80"
        },
        "isHot": true,
        "isFeatured": true,
        "displayOrder": 1,
        "productCount": 28
      }
    ],
    "message": "Categories fetched successfully",
    "success": true
  }
  ```

---

### 4.2 Get Hot Categories (Carousel / Highlights)
- **Endpoint:** `GET /api/v4/category/hot`
- **Access:** Public
- **Query Parameters:** `limit` (default `6`)
- **Response (200 OK):** Top trending categories with product counts.

---

### 4.3 Get Single Category by ID
- **Endpoint:** `GET /api/v4/category/:categoryid`
- **Access:** Public
- **Response (200 OK):** Category details and calculated active product count.

---

### 4.4 Get Products Under Specific Category
- **Endpoint:** `GET /api/v4/category/:categoryid/products`
- **Access:** Public
- **Query Parameters:** `page`, `limit`, `sort`, `fabric`, `minPrice`, `maxPrice`
- **Response (200 OK):** Paginated products belonging strictly to this category.

---

### 4.5 Create Category (Admin Only)
- **Endpoint:** `POST /api/v4/category/create`
- **Access:** Protected (Admin Only)
- **Headers:** `Content-Type: multipart/form-data`
- **Form Data:** `name`, `slug`, `subtitle`, `eyebrow`, `description`, `displayOrder`, `isHot`, `isFeatured`, `image` (file)
- **Response (201 Created):** Created category document.

---

### 4.6 Update Category
- **Endpoint:** `PATCH /api/v4/category/:categoryid/update`
- **Access:** Protected (Admin Only)
- **Headers:** `Content-Type: multipart/form-data`
- **Response (200 OK):** Updated category document.

---

### 4.7 Toggle Hot Status (1-Click)
- **Endpoint:** `PATCH /api/v4/category/:categoryid/toggle-hot`
- **Access:** Protected (Admin Only)
- **Response (200 OK):** Inverts `isHot` and returns updated state.

---

### 4.8 Delete Category
- **Endpoint:** `DELETE /api/v4/category/:categoryid/delete`
- **Access:** Protected (Admin Only)
- **Response (200 OK):** `{ "statusCode": 200, "message": "Category deleted successfully" }`

---

## Module 5: Shopping Cart APIs (`/api/v5/cart`)

### 5.1 Get Customer Cart
- **Endpoint:** `GET /api/v5/cart`
- **Access:** Protected (Customer / Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {
      "_id": "6a91c000123456789abcdef0",
      "user": "6a90fa12b489c7d0012e4321",
      "items": [
        {
          "_id": "6a91c000123456789abcdef1",
          "product": {
            "_id": "6a92b448f316247e015451ba",
            "title": "Embroidered Cambric Kurta & Trouser Set",
            "price": 9500,
            "discountPrice": 7990,
            "images": [{ "url": "https://images.unsplash.com/..." }],
            "stock": 35
          },
          "size": "M",
          "color": "Emerald Green",
          "quantity": 2,
          "price": 7990
        }
      ],
      "subtotal": 15980,
      "totalItems": 2
    },
    "message": "Cart fetched successfully",
    "success": true
  }
  ```

---

### 5.2 Add Item to Cart
- **Endpoint:** `POST /api/v5/cart/add`
- **Access:** Protected
- **Request Body:**
  ```json
  {
    "productId": "6a92b448f316247e015451ba",
    "quantity": 1,
    "size": "L",
    "color": "Navy Blue"
  }
  ```
- **Response (200 OK):** Updated cart with populated product data.

---

### 5.3 Update Item Quantity in Cart
- **Endpoint:** `PATCH /api/v5/cart/quantity`
- **Access:** Protected
- **Request Body:**
  ```json
  {
    "itemId": "6a91c000123456789abcdef1",
    "quantity": 3
  }
  ```
- **Response (200 OK):** Updated cart. If quantity <= 0, item is automatically removed.

---

### 5.4 Remove Item from Cart
- **Endpoint:** `DELETE /api/v5/cart/remove`
- **Access:** Protected
- **Request Body:**
  ```json
  {
    "itemId": "6a91c000123456789abcdef1"
  }
  ```
- **Response (200 OK):** Cart after item removal.

---

### 5.5 Clear Entire Cart
- **Endpoint:** `DELETE /api/v5/cart/clear`
- **Access:** Protected
- **Response (200 OK):** `{ "statusCode": 200, "data": { "items": [] }, "message": "Cart cleared successfully" }`

---

## Module 6: Order Processing & Courier Tracking APIs (`/api/v6/order`)

### 6.1 Place New Luxury Order (Checkout)
- **Endpoint:** `POST /api/v6/order/place`
- **Access:** Protected
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <accessToken>`
- **Request Body:**
  ```json
  {
    "items": [
      {
        "product": "6a92b448f316247e015451ba",
        "size": "M",
        "color": "Emerald Green",
        "quantity": 1,
        "priceAtPurchase": 7990
      }
    ],
    "totalAmount": 7990,
    "paymentMethod": "cod",
    "shippingAddress": {
      "street": "House 14, Street 9, F-7/2",
      "city": "Islamabad",
      "state": "Federal",
      "country": "Pakistan",
      "zip": "44000",
      "phone": "+92 300 1234567"
    },
    "orderNotes": "Please deliver after 3:00 PM"
  }
  ```
- **Behavior & Database Operations:**
  1. Validates inventory for each product and specific size.
  2. Decrements product stock in MongoDB.
  3. Increments `analytics.purchased` count.
  4. Automatically calculates gross profit per item (`priceAtPurchase - costPrice`).
  5. Clears customer shopping cart.
- **Response (201 Created):**
  ```json
  {
    "statusCode": 201,
    "data": {
      "_id": "6a93d000123456789order01",
      "user": "6a90fa12b489c7d0012e4321",
      "items": [...],
      "totalAmount": 7990,
      "totalProfit": 3790,
      "status": "pending",
      "paymentStatus": "unpaid",
      "paymentMethod": "cod",
      "timeline": [
        {
          "status": "pending",
          "note": "Order placed successfully by customer",
          "timestamp": "2026-09-10T12:30:00.000Z"
        }
      ],
      "createdAt": "2026-09-10T12:30:00.000Z"
    },
    "message": "Order placed successfully",
    "success": true
  }
  ```
- **Real-Time Socket Notifications Triggered:**
  - **To `admin_room`:** `emit("new_order", { orderId: "6a93d0...", totalAmount: 7990, customerName: "Ayesha Khan", customerEmail: "ayesha@example.com", itemsCount: 1, createdAt: "2026-09-10T12:30:00.000Z" })`
  - **To `admin_room` (if product stock <= 5):** `emit("low_stock", { productId: "6a92b4...", title: "...", stock: 4 })`

---

### 6.2 Get Customer Order History
- **Endpoint:** `GET /api/v6/order/my`
- **Access:** Protected
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": [
      {
        "_id": "6a93d000123456789order01",
        "totalAmount": 7990,
        "status": "pending",
        "paymentStatus": "unpaid",
        "courier": "Trax Logistics",
        "trackingNumber": "TRX-982173",
        "trackingUrl": "https://trax.pk/tracking?num=TRX-982173",
        "items": [...],
        "createdAt": "2026-09-10T12:30:00.000Z"
      }
    ],
    "message": "Order history fetched successfully",
    "success": true
  }
  ```

---

### 6.3 Cancel Pending Order (Customer Self-Service)
- **Endpoint:** `PATCH /api/v6/order/:orderid/cancel`
- **Access:** Protected (Own order only)
- **Behavior:**
  - Only permitted when `status === "pending"`.
  - Automatically restores inventory stock to MongoDB for all purchased items.
  - Updates order status to `cancelled`.
- **Response (200 OK):** Cancelled order document with updated timeline.

---

### 6.4 Get All Orders (Admin CRM View)
- **Endpoint:** `GET /api/v6/order/all`
- **Access:** Protected (Admin Only)
- **Query Parameters:**
  | Parameter | Type | Description |
  |---|---|---|
  | `page` | Number | Page number (default `1`) |
  | `limit` | Number | Items per page (default `15`) |
  | `status` | String | `pending`, `processing`, `shipped`, `delivered`, `cancelled` |
  | `paymentStatus`| String | `unpaid`, `paid`, `refunded` |
  | `paymentMethod`| String | `cod`, `card`, `jazzcash`, `easypaisa` |
  | `search` | String | Search by 24-character MongoDB Order ObjectId |
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {
      "orders": [...],
      "totalOrders": 84,
      "currentPage": 1,
      "totalPages": 6
    },
    "message": "All orders fetched successfully",
    "success": true
  }
  ```

---

### 6.5 Download Orders CSV Report (Admin Only)
- **Endpoint:** `GET /api/v6/order/download`
- **Access:** Protected (Admin Only)
- **Response:** `Content-Type: text/csv` with filename `orders.csv`.

---

### 6.6 Get Single Order Details
- **Endpoint:** `GET /api/v6/order/:orderid`
- **Access:** Protected (Customer sees own order; Admin sees any order)
- **Response (200 OK):** Full order object with populated user profile and product details.

---

### 6.7 Update Order Status & Payment (Admin Only)
- **Endpoint:** `PATCH /api/v6/order/:orderid/status`
- **Access:** Protected (Admin Only)
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <accessToken>`
- **Request Body:**
  ```json
  {
    "status": "shipped",
    "paymentStatus": "paid"
  }
  ```
- **Response (200 OK):** Updated order document.
- **Real-Time Socket Notifications Emitted:**
  - **To Customer Room (`user_<userId>`):** `emit("order_status_updated", { orderId, status: "shipped", paymentStatus: "paid", timeline, updatedAt })`
  - **To Admin Room (`admin_room`):** `emit("admin_order_updated", { orderId, status: "shipped", paymentStatus: "paid", customerName })`

---

### 6.8 Update Courier Tracking & Dispatch (Admin Only)
- **Endpoint:** `PATCH /api/v6/order/:orderid/tracking`
- **Access:** Protected (Admin Only)
- **Request Body:**
  ```json
  {
    "trackingNumber": "TRX-998822",
    "courier": "TCS Express",
    "trackingUrl": "https://www.tcsexpress.com/track/TRX-998822",
    "estimatedDelivery": "2026-09-14T00:00:00.000Z",
    "note": "Dispatched via TCS Priority Air Cargo"
  }
  ```
- **Behavior:** If order was `pending`, automatically advances status to `shipped`.
- **Response (200 OK):** Updated order document.
- **Real-Time Socket Notifications Emitted:** Emits `order_status_updated` to customer and `admin_order_updated` to admin room.

---

## Module 7: Customer Reviews & Ratings APIs (`/api/v7/review`)

### 7.1 Moderate All Reviews (Admin View)
- **Endpoint:** `GET /api/v7/review/admin/all`
- **Access:** Protected (Admin Only)
- **Query Parameters:** `page`, `limit`, `rating` (1 to 5)
- **Response (200 OK):** Paginated reviews across all store products with user details.

---

### 7.2 Get Reviews for a Specific Product
- **Endpoint:** `GET /api/v7/review/:productid`
- **Access:** Public
- **Query Parameters:** `page`, `limit`
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {
      "reviews": [
        {
          "_id": "6a94e000123456789review1",
          "user": {
            "_id": "6a90fa12b489c7d0012e4321",
            "fullname": "Ayesha Khan",
            "avatar": { "url": "https://res.cloudinary.com/..." }
          },
          "rating": 5,
          "comment": "The fabric quality of this lawn outfit is exceptional! Beautiful craftsmanship.",
          "images": [{ "url": "https://res.cloudinary.com/..." }],
          "createdAt": "2026-09-09T14:00:00.000Z"
        }
      ],
      "total": 14,
      "averageRating": 4.9
    },
    "message": "Product reviews fetched successfully",
    "success": true
  }
  ```

---

### 7.3 Add Review (Verified Customer)
- **Endpoint:** `POST /api/v7/review/:productid/add`
- **Access:** Protected (Customer)
- **Headers:** `Content-Type: multipart/form-data`
- **Form Data:**
  - `rating` (Number: 1 to 5)
  - `comment` (String: 10 to 1000 characters)
  - `images` (Optional photos: Up to 3 files)
- **Response (201 Created):**
  ```json
  {
    "statusCode": 201,
    "data": {
      "_id": "6a94e000123456789review2",
      "product": "6a92b448f316247e015451ba",
      "rating": 5,
      "comment": "Super fast delivery and exact sizing as shown in size guide."
    },
    "message": "Review submitted successfully",
    "success": true
  }
  ```
- **Socket Notification Emitted:**
  - Event: `new_review` to `admin_room`
  - Payload: `{ reviewId, productId, rating: 5, comment: "Super fast..." }`

---

### 7.4 Delete Review
- **Endpoint:** `DELETE /api/v7/review/:reviewid/delete`
- **Access:** Protected (Customer can delete own review; Admin can delete any review)
- **Response (200 OK):** `{ "statusCode": 200, "message": "Review deleted successfully" }`

---

## Module 8: Customer CRM & Admin Management APIs (`/api/v8/admin`)

### 8.1 Get All Registered Customers (CRM Directory)
- **Endpoint:** `GET /api/v8/admin/users`
- **Access:** Protected (Admin Only)
- **Query Parameters:**
  | Parameter | Type | Description |
  |---|---|---|
  | `page` | Number | Page number (default `1`) |
  | `limit` | Number | Customers per page (default `15`) |
  | `search` | String | Regex search across `fullname`, `email`, `username` |
  | `isVerified` | Boolean | Filter verified/unverified accounts |
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {
      "customers": [
        {
          "_id": "6a90fa12b489c7d0012e4321",
          "username": "ayesha_khan",
          "email": "ayesha@example.com",
          "fullname": "Ayesha Khan",
          "isVerified": true,
          "totalOrders": 4,
          "totalSpent": 38400,
          "createdAt": "2026-09-01T10:00:00.000Z"
        }
      ],
      "total": 42,
      "currentPage": 1,
      "totalPages": 3
    },
    "message": "Customers fetched successfully",
    "success": true
  }
  ```

---

### 8.2 Get Customer Detail & Lifetime Spend
- **Endpoint:** `GET /api/v8/admin/users/:userid`
- **Access:** Protected (Admin Only)
- **Response (200 OK):** Detailed customer profile with order history, total spent, and reviews posted.

---

### 8.3 Delete Customer Account
- **Endpoint:** `DELETE /api/v8/admin/users/:userid`
- **Access:** Protected (Admin Only)
- **Response (200 OK):** `{ "statusCode": 200, "message": "Customer account deleted successfully" }`

---

## Module 9: Executive Dashboard & Analytics APIs (`/api/v9/dashboard`)

### 9.1 Executive Financial & Inventory KPI Summary
- **Endpoint:** `GET /api/v9/dashboard/stats`
- **Access:** Protected (Admin Only)
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {
      "users": {
        "totalUsers": 128,
        "newUsersThisMonth": 24,
        "newUsersToday": 3
      },
      "orders": {
        "totalOrders": 84,
        "ordersToday": 7,
        "ordersThisMonth": 52,
        "pendingOrders": 12,
        "processingOrders": 18,
        "shippedOrders": 22,
        "deliveredOrders": 28,
        "cancelledOrders": 4
      },
      "payments": {
        "paidOrders": 68,
        "unpaidOrders": 12,
        "refundedOrders": 4
      },
      "financials": {
        "totalRevenue": 684200,
        "totalProfit": 274100,
        "revenueToday": 48200,
        "profitToday": 19400,
        "revenueThisMonth": 412000,
        "profitThisMonth": 168000
      },
      "inventory": {
        "totalProducts": 101,
        "activeProducts": 98,
        "outOfStockProducts": 3,
        "lowStockProducts": 7,
        "inventoryValuation": 1840000
      },
      "topProducts": [...],
      "recentOrders": [...]
    },
    "message": "Dashboard stats fetched successfully",
    "success": true
  }
  ```

---

### 9.2 Real-Time Live Orders Feed
- **Endpoint:** `GET /api/v9/dashboard/live-orders`
- **Access:** Protected (Admin Only)
- **Response (200 OK):** Returns all active non-finalized orders (`pending` and `processing`) sorted newest first.

---

### 9.3 Monthly Revenue & Orders Breakdown
- **Endpoint:** `GET /api/v9/dashboard/monthly-orders`
- **Access:** Protected (Admin Only)
- **Query Parameters:** `year` (Default: current year)
- **Response (200 OK):** 12-month array containing revenue, orders count, and net profit per month.

---

### 9.4 Inventory Valuation & Stock Health Report
- **Endpoint:** `GET /api/v9/dashboard/inventory-summary`
- **Access:** Protected (Admin Only)
- **Response (200 OK):** Complete breakdown of items by stock category, out-of-stock items, and total capital tied in stock.

---

### 9.5 Single Order Detail View for Admin
- **Endpoint:** `GET /api/v9/dashboard/order/:orderid`
- **Access:** Protected (Admin Only)
- **Response (200 OK):** Full order document with customer contact, shipping addresses, SKU breakdown, cost price, and profit margins.

---

## Module 10: Luxury Banner Slider & Hero APIs (`/api/v10/banner`)

### 10.1 Get Active Hero Slider Banners
- **Endpoint:** `GET /api/v10/banner`
- **Access:** Public
- **Query Parameters:** `collectionType` (`new_arrivals`, `summer_collection`, `monthly_drop`, etc.)
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": [
      {
        "_id": "6a95f000123456789banner1",
        "title": "NOCTURNE VELVET & SILK 2026",
        "subtitle": "HEIRLOOM FORMALS & LUXURY COUTURE",
        "badgeText": "THE AUTUMN EDIT",
        "ctaText": "EXPLORE COLLECTION",
        "ctaLink": "/products?category=luxury-pret",
        "secondaryCtaText": "ORDER SWATCHES",
        "secondaryCtaLink": "/products?category=unstitched-lawn",
        "image": {
          "url": "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=2000&q=90"
        },
        "accentColor": "#C9A84C",
        "priority": 10,
        "isActive": true
      }
    ],
    "message": "Active banners fetched successfully",
    "success": true
  }
  ```

---

### 10.2 Get Banners by Collection Slug
- **Endpoint:** `GET /api/v10/banner/collection/:collectionType`
- **Access:** Public
- **Response (200 OK):** Banners specifically tagged for that seasonal collection.

---

### 10.3 Get All Banners for Admin Configuration
- **Endpoint:** `GET /api/v10/banner/admin/all`
- **Access:** Protected (Admin Only)
- **Response (200 OK):** Full list of active and inactive banners with analytics and priority scores.

---

### 10.4 Create New Hero Banner
- **Endpoint:** `POST /api/v10/banner/create`
- **Access:** Protected (Admin Only)
- **Headers:** `Content-Type: multipart/form-data`
- **Form Data:** `title`, `subtitle`, `badgeText`, `ctaText`, `ctaLink`, `secondaryCtaText`, `secondaryCtaLink`, `collectionType`, `accentColor`, `priority`, `image` (file)
- **Response (201 Created):** Created banner document.

---

### 10.5 Get Single Banner Details
- **Endpoint:** `GET /api/v10/banner/:bannerid`
- **Access:** Public / Admin
- **Response (200 OK):** Single banner configuration.

---

### 10.6 Update Banner
- **Endpoint:** `PATCH /api/v10/banner/:bannerid/update`
- **Access:** Protected (Admin Only)
- **Headers:** `Content-Type: multipart/form-data`
- **Response (200 OK):** Updated banner document.

---

### 10.7 Toggle Banner Active Status (1-Click)
- **Endpoint:** `PATCH /api/v10/banner/:bannerid/toggle-active`
- **Access:** Protected (Admin Only)
- **Response (200 OK):** Inverts `isActive` boolean.

---

### 10.8 Delete Banner
- **Endpoint:** `DELETE /api/v10/banner/:bannerid/delete`
- **Access:** Protected (Admin Only)
- **Response (200 OK):** Removes banner and cleans Cloudinary image assets.

---

## Module 11: Editorial Lookbook & Spotlight APIs (`/api/v11/spotlight`)

### 11.1 Get Active Editorial Spotlights (Public Lookbook)
- **Endpoint:** `GET /api/v11/spotlight`
- **Access:** Public
- **Query Parameters:** `sectionTag`
- **Response (200 OK):** Array of active spotlights with populated `linkedProduct` details.

---

### 11.2 Unified Ultra-Fast Homepage Payload
- **Endpoint:** `GET /api/v11/spotlight/homepage`
- **Access:** Public
- **Purpose:** High-performance single-roundtrip endpoint returning all required homepage data in one request:
  - Active Hero Banners
  - Top Categories with product counts
  - Available Fabric Pills
  - Top Selling Luxury Outfits
  - Editorial Lookbook Spotlights
- **Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "data": {
      "banners": [...],
      "categories": [...],
      "fabrics": [...],
      "topSelling": [...],
      "spotlights": [...]
    },
    "message": "Homepage data loaded successfully",
    "success": true
  }
  ```

---

### 11.3 Admin All Spotlights List
- **Endpoint:** `GET /api/v11/spotlight/admin/all`
- **Access:** Protected (Admin Only)
- **Query Parameters:** `search`, `isActive`
- **Response (200 OK):** Complete editorial inventory.

---

### 11.4 Create Editorial Spotlight
- **Endpoint:** `POST /api/v11/spotlight/create`
- **Access:** Protected (Admin Only)
- **Headers:** `Content-Type: multipart/form-data`
- **Form Data:** `title`, `eyebrow`, `subtitle`, `description`, `linkedProduct` (Product ID), `sectionTag`, `priority`, `image` (file)
- **Response (201 Created):** Created spotlight document.

---

### 11.5 Get Single Spotlight
- **Endpoint:** `GET /api/v11/spotlight/:spotlightid`
- **Access:** Public / Admin
- **Response (200 OK):** Single spotlight object with populated product.

---

### 11.6 Update Spotlight
- **Endpoint:** `PATCH /api/v11/spotlight/:spotlightid/update`
- **Access:** Protected (Admin Only)
- **Headers:** `Content-Type: multipart/form-data`
- **Response (200 OK):** Updated spotlight document.

---

### 11.7 Toggle Spotlight Active Status (1-Click)
- **Endpoint:** `PATCH /api/v11/spotlight/:spotlightid/toggle-active`
- **Access:** Protected (Admin Only)
- **Response (200 OK):** Inverts `isActive` boolean.

---

### 11.8 Delete Editorial Spotlight
- **Endpoint:** `DELETE /api/v11/spotlight/:spotlightid/delete`
- **Access:** Protected (Admin Only)
- **Response (200 OK):** Removes spotlight and cleans Cloudinary image assets.

---

## Module 12: System Health & Diagnostics (`/api/health`)

### 12.1 System & Gateway Health Check
- **Endpoint:** `GET /api/health`
- **Access:** Public
- **Purpose:** Load balancer ping, container liveness probe, and frontend connection check.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "E-Commerce API is healthy"
  }
  ```

---

## 💎 Quick Reference: Real-Time Flow Summary Table

| Action / User Flow | Frontend API Trigger | HTTP Method | Backend Controller & DB | Socket Event Emitted | Target Room | Client Re-render / UI Reaction |
|---|---|---|---|---|---|---|
| **Browse Catalog** | `/api/v3/product?category=...` | `GET` | `getAllProducts` (`Product.find`) | - | - | Redux updates `productsSlice.items`; Filter sidebar counts; zero localStorage |
| **Apply Left Filters** | `/api/v3/product?fabric=...&price=...` | `GET` | `getAllProducts` (regex & ranges) | - | - | Redux debounces & updates grid without page reload |
| **Customer Registers** | `/api/v1/auth/register` | `POST` | `register` (`User.create`) | `new_user_registered` | `admin_room` | Toast alert in Admin Dashboard + Customer sees OTP verification modal |
| **Customer Places Order** | `/api/v6/order/place` | `POST` | `placeOrder` (Transaction & stock drop) | `new_order` & `low_stock` | `admin_room` | Chime sound in Admin Dashboard; Live Order table updates; Cart cleared |
| **Admin Updates Order** | `/api/v6/order/:id/status` | `PATCH` | `updateOrderStatus` (`Order.save`) | `order_status_updated` | `user_<id>` | Customer order timeline updates live on Tracking page |
| **Admin Dispatches Courier**| `/api/v6/order/:id/tracking` | `PATCH` | `updateOrderTracking` (`Order.save`) | `order_status_updated` | `user_<id>` | Courier tracking button and badge turn green for customer |
| **Customer Reviews Product**| `/api/v7/review/:id/add` | `POST` | `addReview` (`Review.create`) | `new_review` | `admin_room` | Admin moderation counter increments; star rating refreshes on product page |

---
**Maintained by:** Haute Couture Engineering Team & Lead AI System Architect  
**All Rights Reserved © 2026**
