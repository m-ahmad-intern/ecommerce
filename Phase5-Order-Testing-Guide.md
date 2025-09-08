# Phase 5: Order Management System - Testing Guide

## Overview
This guide provides comprehensive testing instructions for Phase 5 Order Management System implementation, including checkout process, order tracking, and admin management features.

## Prerequisites
- Server running on `http://localhost:3000`
- Products seeded in database (use seed-products.js)
- User accounts created with cart items
- Admin account available for admin testing

## Testing Setup

### 1. Start the Server
```bash
cd server
npm run start:dev
```

### 2. Required Test Data
- Use products from seed-products.js
- Create user accounts with items in cart
- Have admin account ready for order management

## User Endpoints Testing

### 1. Checkout Process (Create Order from Cart)

**Endpoint:** `POST /orders/checkout`
**Auth:** Required (User Token)

#### Test Case 1: Successful Checkout
```json
POST http://localhost:3000/orders/checkout
Authorization: Bearer YOUR_USER_TOKEN
Content-Type: application/json

{
  "shippingAddress": {
    "fullName": "John Doe",
    "phoneNumber": "+1234567890",
    "streetAddress": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "United States"
  },
  "orderNotes": "Please handle with care"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "order_id",
    "orderNumber": "ORD-1234567890-001",
    "status": "pending",
    "items": [...],
    "subtotal": 150.00,
    "tax": 15.00,
    "total": 165.00,
    "shippingAddress": {...},
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Test Case 2: Empty Cart Checkout
```json
POST http://localhost:3000/orders/checkout
Authorization: Bearer EMPTY_CART_USER_TOKEN
Content-Type: application/json

{
  "shippingAddress": {
    "fullName": "Jane Doe",
    "phoneNumber": "+1234567890",
    "streetAddress": "456 Oak Avenue",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90210",
    "country": "United States"
  }
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Cart is empty. Cannot create order."
}
```

#### Test Case 3: Insufficient Stock
- Add products with quantity exceeding available stock to cart
- Attempt checkout - should fail with stock validation error

### 2. Get User Order History

**Endpoint:** `GET /orders/my-orders`
**Auth:** Required (User Token)

#### Test Case 1: Get All Orders (Default Pagination)
```
GET http://localhost:3000/orders/my-orders
Authorization: Bearer YOUR_USER_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [
    {
      "_id": "order_id",
      "orderNumber": "ORD-1234567890-001",
      "status": "pending",
      "total": 165.00,
      "itemCount": 3,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "items": [...]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalOrders": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

#### Test Case 2: Filter by Status
```
GET http://localhost:3000/orders/my-orders?status=pending&page=1&limit=5
Authorization: Bearer YOUR_USER_TOKEN
```

#### Test Case 3: Sort by Total (Descending)
```
GET http://localhost:3000/orders/my-orders?sortBy=total&sortOrder=desc
Authorization: Bearer YOUR_USER_TOKEN
```

### 3. Get Specific Order Details

**Endpoint:** `GET /orders/my-orders/:id`
**Auth:** Required (User Token)

#### Test Case 1: Valid Order Details
```
GET http://localhost:3000/orders/my-orders/YOUR_ORDER_ID
Authorization: Bearer YOUR_USER_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order details retrieved successfully",
  "data": {
    "_id": "order_id",
    "orderNumber": "ORD-1234567890-001",
    "status": "pending",
    "items": [
      {
        "productId": "product_id",
        "productName": "Cotton T-Shirt",
        "productImage": "image_url",
        "price": 29.99,
        "quantity": 2,
        "size": "M",
        "color": "Blue"
      }
    ],
    "subtotal": 150.00,
    "tax": 15.00,
    "total": 165.00,
    "shippingAddress": {...},
    "orderNotes": "Please handle with care",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Test Case 2: Invalid Order ID
```
GET http://localhost:3000/orders/my-orders/invalid_id
Authorization: Bearer YOUR_USER_TOKEN
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Order not found"
}
```

## Admin Endpoints Testing

### 1. Get All Orders (Admin)

**Endpoint:** `GET /orders/admin/all`
**Auth:** Required (Admin Token)

#### Test Case 1: Get All Orders
```
GET http://localhost:3000/orders/admin/all
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "message": "All orders retrieved successfully",
  "data": [
    {
      "_id": "order_id",
      "orderNumber": "ORD-1234567890-001",
      "status": "pending",
      "total": 165.00,
      "customer": {
        "_id": "user_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "itemCount": 3,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {...}
}
```

#### Test Case 2: Filter by Status (Admin)
```
GET http://localhost:3000/orders/admin/all?status=pending&page=1&limit=10
Authorization: Bearer YOUR_ADMIN_TOKEN
```

### 2. Get Order Details (Admin)

**Endpoint:** `GET /orders/admin/:id`
**Auth:** Required (Admin Token)

#### Test Case 1: Valid Order Details (Admin View)
```
GET http://localhost:3000/orders/admin/YOUR_ORDER_ID
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Expected Response:** Full order details with customer information

### 3. Update Order Status (Admin)

**Endpoint:** `PUT /orders/admin/:id/status`
**Auth:** Required (Admin Token)

#### Test Case 1: Valid Status Update (Pending to Confirmed)
```json
PUT http://localhost:3000/orders/admin/YOUR_ORDER_ID/status
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "status": "confirmed",
  "statusNote": "Order confirmed by admin. Processing will begin shortly."
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "_id": "order_id",
    "orderNumber": "ORD-1234567890-001",
    "status": "confirmed",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

#### Test Case 2: Invalid Status Transition
```json
PUT http://localhost:3000/orders/admin/YOUR_ORDER_ID/status
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "status": "delivered",
  "statusNote": "Attempting invalid transition"
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Cannot change status from pending to delivered"
}
```

#### Test Valid Status Transitions:
1. **pending** → confirmed, cancelled
2. **confirmed** → processing, cancelled
3. **processing** → shipped, cancelled
4. **shipped** → delivered
5. **delivered** → (no transitions)
6. **cancelled** → (no transitions)

### 4. Get Order Statistics (Admin)

**Endpoint:** `GET /orders/admin/statistics/overview`
**Auth:** Required (Admin Token)

#### Test Case 1: Order Statistics
```
GET http://localhost:3000/orders/admin/statistics/overview
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order statistics retrieved successfully",
  "data": {
    "totalOrders": 25,
    "pendingOrders": 5,
    "processingOrders": 8,
    "shippedOrders": 7,
    "deliveredOrders": 3,
    "cancelledOrders": 2,
    "totalRevenue": 2750.50,
    "recentOrders": [...]
  }
}
```

## Utility Endpoints Testing

### 1. Get Order Status Options

**Endpoint:** `GET /orders/status-options`
**Auth:** Required

#### Test Case 1: Status Options
```
GET http://localhost:3000/orders/status-options
Authorization: Bearer YOUR_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order status options retrieved successfully",
  "data": {
    "statuses": ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
    "descriptions": {
      "pending": "Order placed, awaiting confirmation",
      "confirmed": "Order confirmed, preparing for processing",
      "processing": "Order is being processed",
      "shipped": "Order has been shipped",
      "delivered": "Order delivered successfully",
      "cancelled": "Order cancelled"
    }
  }
}
```

## Complete Order Flow Testing

### Scenario 1: Complete Successful Order Flow
1. **Setup:** User with items in cart
2. **Step 1:** Checkout order (`POST /orders/checkout`)
3. **Step 2:** Verify order in user history (`GET /orders/my-orders`)
4. **Step 3:** Get order details (`GET /orders/my-orders/:id`)
5. **Step 4:** Admin confirms order (`PUT /orders/admin/:id/status` → confirmed)
6. **Step 5:** Admin processes order (`PUT /orders/admin/:id/status` → processing)
7. **Step 6:** Admin ships order (`PUT /orders/admin/:id/status` → shipped)
8. **Step 7:** Admin marks delivered (`PUT /orders/admin/:id/status` → delivered)
9. **Step 8:** Verify final status in both user and admin views

### Scenario 2: Order Cancellation Flow
1. **Setup:** Order in pending or confirmed status
2. **Step 1:** Admin cancels order (`PUT /orders/admin/:id/status` → cancelled)
3. **Step 2:** Verify status cannot be changed from cancelled
4. **Step 3:** Check order appears in cancelled orders filter

### Scenario 3: Stock Validation
1. **Setup:** Products with limited stock
2. **Step 1:** Add items to cart exceeding stock
3. **Step 2:** Attempt checkout
4. **Step 3:** Verify checkout fails with stock error
5. **Step 4:** Reduce cart quantities and retry successful checkout
6. **Step 5:** Verify product stock reduced after successful order

## Error Handling Tests

### Authentication Errors
- Test all endpoints without token (401 Unauthorized)
- Test user endpoints with admin token (should work)
- Test admin endpoints with user token (403 Forbidden)

### Validation Errors
- Invalid shipping address data
- Invalid order status values
- Missing required fields
- Invalid ObjectId formats

### Business Logic Errors
- Empty cart checkout
- Insufficient stock
- Invalid status transitions
- Non-existent order access

## Performance Considerations

### Load Testing Scenarios
1. **Concurrent Checkouts:** Multiple users checking out simultaneously
2. **Large Order History:** Users with many orders (pagination testing)
3. **Admin Dashboard:** Loading statistics with many orders

### Database Validation
1. **Stock Consistency:** Verify stock updates are atomic
2. **Order Numbers:** Ensure uniqueness under concurrent load
3. **Status Transitions:** Verify integrity under concurrent updates

## Success Criteria

✅ **All user endpoints working correctly**
✅ **All admin endpoints working correctly**
✅ **Proper authentication and authorization**
✅ **Stock deduction working correctly**
✅ **Order status transitions follow business rules**
✅ **Cart cleared after successful checkout**
✅ **Order statistics accurate**
✅ **Pagination working correctly**
✅ **Error handling comprehensive**
✅ **API documentation complete**

## Notes
- Order numbers are generated with timestamp + random suffix for uniqueness
- Tax is calculated at 10% of subtotal
- Stock updates are immediate upon successful checkout
- Order notes accumulate status change history
- All monetary values are rounded to 2 decimal places

This completes the comprehensive testing guide for Phase 5 Order Management System!
