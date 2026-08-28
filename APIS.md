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
11. [Admin Analytics & Dashboard APIs (`/api/v9/dashboard`)](#9-admin-analytics--dashboard-apis-apiv9dashboard)
12. [Banner & Store Configuration APIs (`/api/v10/banner`)](#10-banner--store-configuration-apis-apiv10banner)
13. [System Health Check (`/api/health`)](#11-system-health-check-apihealth)
14. [Google OAuth Setup Guide](#-google-oauth-20-setup-guide)
15. [Socket.io Real-Time Events](#-socketio-real-time-events)


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
  - Cookie: `accessToken=<token>`
- **User Roles:**
  - `user`: Standard customer (browsing, cart, orders, reviews, personal profile).
  - `admin`: Single master administrator with 100% store control (inventory, products, hot deals, orders, payments, analytics, customers, review moderation).

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

### 1.5 Get Current Authenticated User (`/me`)
- **Method:** `GET`
- **Endpoint:** `/api/v1/auth/me`
- **Access:** Authenticated (`user` or `admin`)
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` (Returns currently logged-in user profile with role)


---

### 1.5 Forgot Password (Request OTP)
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

### 1.6 Verify Reset Password OTP
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

### 1.7 Reset Password
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

### 1.8 Logout
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
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `title` (string, required)
  - `description` (string, required)
  - `price` (number, required)
  - `discountPrice` (number, optional)
  - `stock` (number, default: 0)
  - `category` (ObjectId, required)
  - `tags` (string or array, e.g. "summer,cotton,casual")
  - `isHot` (boolean, optional)
  - `isFeatured` (boolean, optional)
  - `image` (Files, up to 5 images - automatically converted to WebP/AVIF with 4:5 fashion thumbnails)

---

### 3.5 Update Product (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v3/product/:productid/update`
- **Access:** `Admin`
- **Content-Type:** `multipart/form-data`
- **Form Fields:** `title`, `description`, `price`, `discountPrice`, `stock`, `category`, `tags`, `isActive`, `isHot`, `isFeatured`, `image` (optional new images)

---

### 3.6 Quick 1-Click Stock Update (Admin Only)
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

### 3.7 Toggle Hot / Featured Status (Admin Only)
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

---

### 3.8 Delete Product (Admin Only)
- **Method:** `DELETE`
- **Endpoint:** `/api/v3/product/:productid/delete`
- **Access:** `Admin`
- **Behavior:** Deletes product and removes all related images from Cloudinary CDN.

---

### 3.9 Admin Full Inventory List
- **Method:** `GET`
- **Endpoint:** `/api/v3/product/admin/all`
- **Access:** `Admin`
- **Query Parameters:** `page`, `limit`, `category`, `search`, `isActive`, `isHot`, `stockStatus` (`out_of_stock`, `low_stock`, `in_stock`), `sort` (`stock-asc`, `stock-desc`, `sales-desc`, `views-desc`, `price-asc`, `price-desc`)

---

### 3.10 Low Stock & Out of Stock Alerts
- **Method:** `GET`
- **Endpoint:** `/api/v3/product/admin/low-stock?threshold=5`
- **Access:** `Admin`
- **Response:** `200 OK` (Returns lists and counts of out-of-stock and low-stock items)

---

### 3.11 Product Performance Analytics
- **Method:** `GET`
- **Endpoint:** `/api/v3/product/:productid/analytics`
- **Access:** `Admin`
- **Response:** `200 OK` (Views, Add to Cart count, Purchases, Revenue generated, Conversion rate %)

---

### 3.12 Gallery Image Operations
- **Add Image:** `POST /api/v3/product/:productid/image/add` (`multipart/form-data`, field: `image`)
- **Delete Image:** `DELETE /api/v3/product/:productid/image/delete` (`body: { "public_id": "..." }`)

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

### 4.3 Get Single Category
- **Method:** `GET`
- **Endpoint:** `/api/v4/category/:categoryid`
- **Access:** Public

---

### 4.4 Create Category (Admin Only)
- **Method:** `POST`
- **Endpoint:** `/api/v4/category/create`
- **Access:** `Admin`
- **Content-Type:** `multipart/form-data`
- **Form Fields:** `name` (required), `slug` (required), `isHot`, `isFeatured`, `image` (file)

---

### 4.5 Update Category (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v4/category/:categoryid/update`
- **Access:** `Admin`
- **Form Fields:** `name`, `slug`, `isHot`, `isFeatured`, `image` (file)

---

### 4.6 Toggle Hot Category (Admin Only)
- **Method:** `PATCH`
- **Endpoint:** `/api/v4/category/:categoryid/toggle-hot`
- **Access:** `Admin`
- **Body:** `{ "isHot": true }`

---

### 4.7 Delete Category (Admin Only)
- **Method:** `DELETE`
- **Endpoint:** `/api/v4/category/:categoryid/delete`
- **Access:** `Admin`
- **Protection:** Prevents deletion if active products are assigned to this category.

---

## 5. Cart APIs (`/api/v5/cart`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v5/cart` | Customer | Get customer's cart with live pricing and stock status |
| `POST` | `/api/v5/cart/add` | Customer | Add item to cart (`{ "productId": "...", "quantity": 1 }`) |
| `PATCH` | `/api/v5/cart/quantity` | Customer | Update item quantity in cart (`{ "productId": "...", "quantity": 3 }`) |
| `DELETE` | `/api/v5/cart/remove` | Customer | Remove specific item (`{ "productId": "..." }`) |
| `DELETE` | `/api/v5/cart/clear` | Customer | Clear entire cart |

---

## 6. Order & Payment APIs (`/api/v6/order`)

### 6.1 Place Order (Customer)
- **Method:** `POST`
- **Endpoint:** `/api/v6/order/place`
- **Access:** Customer
- **Behavior:**
  - Validates inventory stock and automatically deducts stock.
  - Snapshots product prices at the moment of checkout.
  - Clears customer cart.
  - Emits real-time Socket.io event (`new_order`) to admin room.
- **Body:** `application/json`
```json
{
  "shippingAddress": {
    "street": "123 Fashion Blvd",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA",
    "phone": "+1234567890"
  },
  "paymentMethod": "card"
}
```

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

### 6.7 Download Orders CSV Report (Admin Only)
- **Method:** `GET`
- **Endpoint:** `/api/v6/order/download`
- **Access:** `Admin`
- **Query Parameters:** `status`, `paymentStatus`
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

### 9.1 Executive Store Analytics
- **Method:** `GET`
- **Endpoint:** `/api/v9/dashboard/stats`
- **Access:** `Admin`
- **Response Metrics:**
  - **Lifetime Total Revenue** ($)
  - **Today's Revenue** & **This Month's Revenue**
  - **Last Month's Revenue** & **Month-over-Month Growth %**
  - **Order Counts by Status** (Pending, Processing, Shipped, Delivered, Cancelled)
  - **Payment Status Breakdown** (Paid, Unpaid, Refunded)
  - **Customer Metrics** (Total customers, new today, new this month)
  - **Inventory Stats** (Active/Inactive products, out-of-stock count, low-stock count, total units, total inventory valuation $)
  - **Top Selling Products** (with units sold and revenue)
  - **Category Revenue Share** (Pie chart aggregation)
  - **Daily Revenue & Orders Chart Data** (For current month sales graphs)

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

---

## 11. System Health Check (`/api/health`)

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

- **Admin Room Subscription:**
  - Client emits: `join_admin_room`
- **Real-Time Notification Event:**
  - Event Name: `new_order`
  - Payload:
```json
{
  "orderId": "66ce...",
  "totalAmount": 149.99,
  "customerName": "Jane Smith",
  "customerEmail": "jane@example.com",
  "itemsCount": 2,
  "createdAt": "2026-08-28T14:35:00.000Z"
}
```

