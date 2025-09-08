# E-Commerce Backend Development Plan

## Overview
This plan outlines the development of a NestJS backend for an e-commerce clothing store with MongoDB Atlas, JWT authentication, and Cloudinary integration.

## Tech Stack
- **Framework**: NestJS
- **Database**: MongoDB Atlas
- **Authentication**: JWT
- **File Storage**: Cloudinary
- **Real-time**: Socket.IO
- **Validation**: class-validator, class-transformer

---

## Phase 1: Foundation Setup & Database Models
**Goal**: Set up core infrastructure and database schemas
**Duration**: 1-2 days
**Test Criteria**: Database connection works, models can be created/queried

### 1.1 Environment & Dependencies Setup
- [x] MongoDB Atlas connection string added to .env
- [x] Cloudinary credentials added to .env
- [ ] Install additional dependencies (cloudinary, multer)
- [ ] Configure MongoDB connection in app.module.ts
- [ ] Test database connection

### 1.2 Database Schemas Creation
Create Mongoose schemas for:

#### User Schema
```typescript
{
  email: string (unique, required)
  password: string (hashed, required)
  firstName: string (required)
  lastName: string (required)
  role: enum ['user', 'admin', 'super_admin'] (default: 'user')
  isEmailVerified: boolean (default: false)
  createdAt: Date
  updatedAt: Date
}
```

#### Product Schema
```typescript
{
  name: string (required)
  description: string (required)
  price: number (required)
  salePrice: number (optional)
  isOnSale: boolean (default: false)
  images: string[] (Cloudinary URLs)
  category: string (required)
  sizes: string[] (e.g., ['S', 'M', 'L', 'XL'])
  colors: string[] (e.g., ['Red', 'Blue', 'Black'])
  stock: number (required, default: 0)
  isActive: boolean (default: true)
  createdAt: Date
  updatedAt: Date
  createdBy: ObjectId (ref: User)
}
```

#### Cart Schema
```typescript
{
  userId: ObjectId (ref: User, required)
  items: [{
    productId: ObjectId (ref: Product)
    quantity: number (min: 1)
    size: string (optional)
    color: string (optional)
    addedAt: Date
  }]
  updatedAt: Date
}
```

#### Order Schema
```typescript
{
  userId: ObjectId (ref: User, required)
  orderNumber: string (unique, auto-generated)
  items: [{
    productId: ObjectId (ref: Product)
    productName: string (snapshot)
    productImage: string (snapshot)
    price: number (snapshot)
    quantity: number
    size: string (optional)
    color: string (optional)
  }]
  subtotal: number
  tax: number (optional)
  total: number
  status: enum ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
  shippingAddress: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  createdAt: Date
  updatedAt: Date
}
```

### 1.3 Testing Phase 1
- [ ] Create test scripts to verify database connection
- [ ] Test CRUD operations for each schema
- [ ] Verify schema validations work correctly

---

## Phase 2: Authentication System
**Goal**: Implement secure JWT-based authentication with role-based access and email verification
**Duration**: 2-3 days
**Test Criteria**: Users can register, verify email with OTP, login, and access protected routes based on roles

### 2.1 Authentication Module Setup
- [ ] Create auth module, service, and controller
- [ ] Set up JWT strategy with Passport
- [ ] Create DTOs for registration, login, and email verification
- [ ] Implement password hashing with bcryptjs
- [ ] Set up email service for OTP sending

### 2.2 Email Verification System
- [ ] Generate and store OTP codes
- [ ] Send OTP via email (using nodemailer or similar)
- [ ] Implement OTP verification endpoint
- [ ] Add OTP expiration logic (5-10 minutes)
- [ ] Update User schema to include email verification fields

### 2.3 Authentication Endpoints
```typescript
POST /auth/register (sends OTP to email)
POST /auth/verify-email (verify OTP and activate account)
POST /auth/resend-otp (resend OTP if expired)
POST /auth/login (only verified users can login)
POST /auth/logout
GET /auth/profile (protected)
PUT /auth/profile (protected)
POST /auth/forgot-password (optional - send reset OTP)
POST /auth/reset-password (optional - verify OTP and reset)
```

### 2.4 Enhanced User Schema
```typescript
{
  email: string (unique, required)
  password: string (hashed, required)
  firstName: string (required)
  lastName: string (required)
  role: enum ['user', 'admin', 'super_admin'] (default: 'user')
  isEmailVerified: boolean (default: false)
  emailVerificationOTP: string (optional)
  otpExpiresAt: Date (optional)
  passwordResetOTP: string (optional)
  passwordResetExpiresAt: Date (optional)
  createdAt: Date
  updatedAt: Date
}
```

### 2.3 Guards and Decorators
- [ ] Create JWT Auth Guard
- [ ] Create Role-based Guard (RoleGuard)
- [ ] Create custom decorators (@Roles, @CurrentUser)
- [ ] Implement route protection

### 2.4 Testing Phase 2
- [ ] Test user registration with validation
- [ ] Test user login and JWT token generation
- [ ] Test protected routes access
- [ ] Test role-based access control
- [ ] Test password hashing and verification

---

## Phase 3: Product Management System
**Goal**: Complete product CRUD with image upload via Cloudinary
**Duration**: 2-3 days
**Test Criteria**: Admins can manage products, users can view products with filtering

### 3.1 Cloudinary Integration
- [ ] Set up Cloudinary service
- [ ] Create file upload middleware
- [ ] Implement image upload and deletion functions
- [ ] Handle multiple image uploads for products

### 3.2 Product Module
- [ ] Create product module, service, and controller
- [ ] Implement DTOs for product creation and updates
- [ ] Add validation for product data

### 3.3 Product Endpoints
```typescript
// Public endpoints
GET /products (with pagination, filtering, search)
GET /products/:id
GET /products/category/:category

// Admin only endpoints
POST /products (admin only - create product)
PUT /products/:id (admin only - update product)
DELETE /products/:id (admin only - delete product)
POST /products/:id/images (admin only - upload images)
DELETE /products/:id/images/:imageId (admin only - delete image)
```

### 3.4 Product Features
- [ ] Implement product filtering (category, price range, size, color)
- [ ] Implement product search (name, description)
- [ ] Implement pagination for product listings
- [ ] Add stock management
- [ ] Implement sale price functionality

### 3.5 Testing Phase 3
- [ ] Test product creation with image uploads
- [ ] Test product listing with filters and pagination
- [ ] Test product updates and deletions
- [ ] Test image upload and deletion
- [ ] Test search functionality
- [ ] Verify admin-only access to protected endpoints

---

## Phase 4: Cart Management System ✅
**Goal**: Implement shopping cart functionality
**Duration**: 1-2 days  
**Status**: ✅ **COMPLETED** (September 3, 2025)
**Test Criteria**: Users can add/remove items, cart persists across sessions

### 4.1 Cart Module
- [x] Create cart module, service, and controller
- [x] Implement cart item DTOs (AddToCartDto, UpdateCartItemDto, RemoveFromCartDto)
- [x] Add cart validation logic with stock checking

### 4.2 Cart Endpoints
```typescript
GET /cart (user's cart with populated products)
GET /cart/count (cart item count)
POST /cart/add (add item to cart with variants)
PUT /cart/item/:itemId (update item quantity/variants)
DELETE /cart/remove (remove by product details)
DELETE /cart/item/:itemId (remove by item ID)
DELETE /cart/clear (clear entire cart)
GET /cart/admin/analytics (admin cart analytics)
```

### 4.3 Cart Features
- [x] Implement add to cart with size/color options for clothing
- [x] Handle quantity updates and variant changes
- [x] Implement multiple removal methods
- [x] Add cart total calculations (subtotal, tax 10%, total)
- [x] Handle stock validation when adding items
- [x] Product population with current pricing
- [x] Duplicate item merging for same variants
- [x] Admin analytics for dashboard

### 4.4 Testing Phase 4
- [x] Test adding items to cart with variants
- [x] Test quantity updates and stock validation
- [x] Test item removal (both methods)
- [x] Test cart calculations with tax
- [x] Test cart persistence and population
- [x] Test admin analytics endpoint
- [x] Server compilation and route mapping verified

---

## Phase 5: Order Management System ✅ COMPLETED
**Goal**: Complete order processing and history
**Duration**: 2-3 days
**Test Criteria**: Users can place orders, view order history, admins can manage orders

### 5.1 Order Module ✅
- [x] Create order module, service, and controller
- [x] Implement order DTOs
- [x] Add order validation and business logic

### 5.2 Order Endpoints ✅
```typescript
// User endpoints
POST /orders/checkout (create order from cart)
GET /orders/my-orders (user's order history with pagination)
GET /orders/my-orders/:id (specific order details)

// Admin endpoints
GET /orders/admin/all (all orders with filters - admin only)
GET /orders/admin/:id (any order details - admin only)
PUT /orders/admin/:id/status (update order status - admin only)
GET /orders/admin/statistics/overview (order statistics - admin only)

// Utility endpoints
GET /orders/status-options (available order statuses)
```

### 5.3 Order Features ✅
- [x] Implement checkout process (convert cart to order)
- [x] Generate unique order numbers (ORD-timestamp-random)
- [x] Handle stock deduction on order placement
- [x] Implement order status tracking (pending→confirmed→processing→shipped→delivered)
- [x] Add order total calculations with tax (10% tax rate)
- [x] Order item snapshots (product name, price, image at time of order)
- [x] Shipping address validation
- [x] Order status transition validation
- [x] Order statistics for admin dashboard

### 5.4 Testing Phase 5 ✅
- [x] Test order creation from cart
- [x] Test order history retrieval with pagination
- [x] Test order status updates with transition validation
- [x] Test stock deduction during checkout
- [x] Test order number generation for uniqueness
- [x] Verify admin order management functionality
- [x] Created comprehensive testing guide (Phase5-Order-Testing-Guide.md)

---

## Phase 6: Sale System & Real-time Notifications
**Goal**: Implement sale management and Socket.IO notifications
**Duration**: 2-3 days
**Test Criteria**: Sales can be applied to products, users receive real-time notifications

### 6.1 Sale Management
- [ ] Add sale-related fields to Product schema (if not already added)
- [ ] Create sale management endpoints for admins
- [ ] Implement sale price calculations

### 6.2 Sale Endpoints
```typescript
// Admin only
PUT /products/:id/sale (apply sale to product)
DELETE /products/:id/sale (remove sale from product)
POST /products/bulk-sale (apply sale to multiple products)
```

### 6.3 Socket.IO Integration
- [ ] Set up Socket.IO gateway
- [ ] Implement sale notification events
- [ ] Create notification service
- [ ] Handle client connections and disconnections

### 6.4 Notification Features
- [ ] Send real-time notifications when sales start
- [ ] Implement user-specific notifications
- [ ] Add notification history (optional)

### 6.5 Testing Phase 6
- [ ] Test sale application and removal
- [ ] Test sale price calculations
- [ ] Test Socket.IO connections
- [ ] Test real-time sale notifications
- [ ] Test bulk sale operations

---

## Phase 7: Admin Dashboard APIs
**Goal**: Provide comprehensive admin management endpoints
**Duration**: 1-2 days
**Test Criteria**: Admins have full control over products, orders, and users

### 7.1 Admin Dashboard Endpoints
```typescript
// Dashboard statistics
GET /admin/dashboard/stats

// User management
GET /admin/users (list all users)
PUT /admin/users/:id/role (change user role - super admin only)
DELETE /admin/users/:id (delete user - super admin only)

// Order management
GET /admin/orders/summary
GET /admin/orders/recent
PUT /admin/orders/:id/status

// Product management
GET /admin/products/low-stock
GET /admin/products/sales-report
```

### 7.2 Admin Features
- [ ] Implement dashboard statistics (total orders, revenue, users, products)
- [ ] Add user role management (super admin only)
- [ ] Create order summary and reports
- [ ] Implement low stock alerts
- [ ] Add sales reporting

### 7.3 Testing Phase 7
- [ ] Test dashboard statistics
- [ ] Test user role management
- [ ] Test order management
- [ ] Test product reports
- [ ] Verify super admin exclusive features

---

## Phase 8: Error Handling, Validation & Security
**Goal**: Implement comprehensive error handling and security measures
**Duration**: 1-2 days
**Test Criteria**: All endpoints handle errors gracefully, proper validation and security

### 8.1 Error Handling
- [ ] Implement global exception filter
- [ ] Create custom exception classes
- [ ] Add proper HTTP status codes
- [ ] Implement validation error messages

### 8.2 Security Enhancements
- [ ] Add rate limiting
- [ ] Implement CORS configuration
- [ ] Add request logging
- [ ] Implement input sanitization

### 8.3 Validation Improvements
- [ ] Enhance DTO validations
- [ ] Add custom validators
- [ ] Implement business rule validations

### 8.4 Testing Phase 8
- [ ] Test error handling scenarios
- [ ] Test validation errors
- [ ] Test security measures
- [ ] Test rate limiting
- [ ] Verify proper error responses

---

## Testing Strategy

### Unit Tests
- Service layer tests for business logic
- DTO validation tests
- Helper function tests

### Integration Tests
- API endpoint tests
- Database integration tests
- Authentication flow tests

### Manual Testing Checklist
Each phase should include:
- [ ] Postman collection testing
- [ ] Database state verification
- [ ] Error scenario testing
- [ ] Role-based access testing

---

## Deployment Preparation

### Environment Configuration
- [ ] Set up production environment variables
- [ ] Configure MongoDB Atlas production cluster
- [ ] Set up Cloudinary production account

### Documentation
- [ ] Create API documentation (Swagger)
- [ ] Document environment setup
- [ ] Create deployment guide

---

---

## Phase 3.5: Reviews System Extension
**Goal**: Add product reviews functionality as an extension to the products module
**Duration**: 0.5-1 day
**Test Criteria**: Users can create/delete reviews, admins can manage reviews, product ratings are auto-calculated

### 3.5.1 Review Schema & Database
Create review schema with:
```typescript
{
  userId: ObjectId (ref: 'User', required)
  productId: ObjectId (ref: 'Product', required)
  rating: number (1-5, required)
  comment: string (10-500 chars, required)
  createdAt: Date
  updatedAt: Date
}
```

Update Product Schema to include:
```typescript
{
  averageRating: number (default: 0, auto-calculated)
  totalReviews: number (default: 0, auto-calculated)
}
```

### 3.5.2 Reviews Module Implementation
- [x] **reviews.service.ts**: CRUD operations, rating calculations
  - Create review (validate one per user per product)
  - Get reviews for product (with pagination, sorting)
  - Delete review (user own + admin any)
  - Auto-update product average rating
- [x] **reviews.controller.ts**: Authenticated endpoints
  - `POST /products/:id/reviews` - Create review
  - `GET /products/:id/reviews` - Get product reviews
  - `DELETE /reviews/:id` - Delete own review
  - `GET /reviews/my-reviews` - Get user's reviews
  - `DELETE /admin/reviews/:id` - Admin delete any review
- [x] **review.dto.ts**: Validation DTOs
  - CreateReviewDto (rating 1-5, comment 10-500 chars)
  - GetReviewsDto (pagination, sorting)

### 3.5.3 Integration & Business Logic
- [x] One review per user per product enforcement
- [x] Auto-calculate and update product average rating
- [x] Basic sorting (newest, oldest, highest/lowest rating)
- [x] Pagination for review lists
- [x] Role-based permissions (user vs admin)

### 3.5.4 API Endpoints Summary
```
POST   /products/:id/reviews          # Create review (auth required)
GET    /products/:id/reviews          # Get product reviews (public)
DELETE /reviews/:id                   # Delete own review (auth required)
GET    /reviews/my-reviews            # Get user's reviews (auth required)
DELETE /admin/reviews/:id             # Admin delete review (admin only)
```

---

## Next Steps After Backend Completion
1. Frontend integration with API
2. Socket.IO client setup
3. Image upload UI components
4. Admin dashboard UI
5. Reviews UI components (rating stars, review forms)
6. Testing and bug fixes

---

## Key Dependencies to Install

```bash
npm install @nestjs/mongoose mongoose
npm install cloudinary multer @nestjs/platform-express
npm install @types/multer
npm install @nestjs/throttler  # for rate limiting
```

This plan ensures each phase is independently testable and builds upon the previous phase. Each phase should be completed and thoroughly tested before moving to the next one.
