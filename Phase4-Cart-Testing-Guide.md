# Phase 4: Cart Management System - Testing Guide

## 🎯 Overview

This guide provides step-by-step instructions for testing the Phase 4 cart management system with seeded products and user accounts.

## 📋 Prerequisites

1. ✅ Server running on `http://localhost:3000`
2. ✅ MongoDB Atlas connected
3. ✅ Admin accounts with valid tokens
4. ✅ Products seeded using the seed script

---

## 🌱 Step 1: Seed Test Products

First, let's seed the database with test products:

```bash
# Navigate to server directory
cd server

# Install axios if not already installed
npm install axios

# Run the seeding script
node seed-products.js
```

**Expected Output:**
```
🌱 Starting product seeding...

📦 Seeding Casual products...
  Creating: Cotton T-Shirt
  ✅ Created: Cotton T-Shirt (ID: 68b...)
  Creating: Denim Jeans
  ✅ Created: Denim Jeans (ID: 68b...)
  [... more products ...]

🎉 Seeding completed!
✅ Successfully created: 16 products
❌ Failed to create: 0 products
📊 Total products across 4 categories: 16
```

---

## 👥 Step 2: User Accounts for Testing

### Admin Accounts (for product management):
```javascript
Admin 1:
- Email: admin@example.com
- Password: Admin12345
- Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGI3M2FmNjg5YTk5N2VlYTA4MGRlMzkiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU2ODgzOTAyLCJleHAiOjE3NTY5NzAzMDJ9.V-RS9H4HORlxh8_7Rl226a0t-YiKscxfzYGnS0u9_fQ

Admin 2:
- Email: admin2@example.com
- Password: Admin12345
- Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGI3NDM5ZjQ4MTg0ZDFlNWFkMjhhZmIiLCJlbWFpbCI6ImFkbWluMkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1Njg4NDA4NywiZXhwIjoxNzU2OTcwNDg3fQ.mcRUBb1msIqPfA-ne4gYaGrmwZaLC3VVGMqStyaEppA

SuperAdmin:
- Email: superadmin@example.com
- Password: SuperAdmin123
- Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGI3M2QyYzg5YTk5N2VlYTA4MGRlNTIiLCJlbWFpbCI6InN1cGVyYWRtaW5nQGV4YW1wbGUuY29tIiwicm9sZSI6InN1cGVyX2FkbWluIiwiaWF0IjoxNzU2ODg0Mjc1LCJleHAiOjE3NTY5NzA2NzV9.IhHzkYA52JEyEYpY_2MKl8SB2RCSImRpIkqX2upB_6Y
```

### Regular User Account (create for cart testing):
```javascript
// First, register a regular user
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "TestUser123",
  "firstName": "Test",
  "lastName": "User"
}

// Then login to get token
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "TestUser123"
}
```

---

## 🛍️ Step 3: Cart Testing Workflow

### 3.1 Get Available Products

First, let's see what products are available:

```bash
# Get all products
curl -X GET "http://localhost:3000/products"

# Get products by category
curl -X GET "http://localhost:3000/products/category/Casual"
curl -X GET "http://localhost:3000/products/category/Formal"
curl -X GET "http://localhost:3000/products/category/Party"
curl -X GET "http://localhost:3000/products/category/Gym"

# Get categories list
curl -X GET "http://localhost:3000/products/categories"
```

### 3.2 Test Cart Functionality

**Important**: Replace `YOUR_USER_TOKEN` with the JWT token from your regular user login.

#### A. Get Empty Cart
```bash
curl -X GET "http://localhost:3000/cart" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

**Expected Response:**
```json
{
  "items": [],
  "itemCount": 0,
  "subtotal": 0,
  "tax": 0,
  "total": 0
}
```

#### B. Add Items to Cart
```bash
# Add Cotton T-Shirt (size M, black)
curl -X POST "http://localhost:3000/cart/add" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID_HERE",
    "quantity": 2,
    "size": "M",
    "color": "Black"
  }'

# Add Denim Jeans (size 32, blue)
curl -X POST "http://localhost:3000/cart/add" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID_HERE",
    "quantity": 1,
    "size": "32",
    "color": "Blue"
  }'
```

#### C. Get Cart with Items
```bash
curl -X GET "http://localhost:3000/cart" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

**Expected Response:**
```json
{
  "_id": "cart_id",
  "items": [
    {
      "_id": "item_id",
      "product": {
        "_id": "product_id",
        "name": "Cotton T-Shirt",
        "price": 25.99,
        "salePrice": 19.99,
        "isOnSale": true,
        "images": [],
        "stock": 50
      },
      "quantity": 2,
      "size": "M",
      "color": "Black",
      "itemTotal": 39.98,
      "addedAt": "2025-09-03T..."
    }
  ],
  "itemCount": 3,
  "subtotal": 119.97,
  "tax": 11.997,
  "total": 131.97
}
```

#### D. Get Cart Item Count
```bash
curl -X GET "http://localhost:3000/cart/count" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

#### E. Update Cart Item
```bash
# Update quantity and size
curl -X PUT "http://localhost:3000/cart/item/ITEM_ID" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3,
    "size": "L",
    "color": "White"
  }'
```

#### F. Remove Item by Product Details
```bash
curl -X DELETE "http://localhost:3000/cart/remove" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID_HERE",
    "size": "M",
    "color": "Black"
  }'
```

#### G. Remove Item by Item ID
```bash
curl -X DELETE "http://localhost:3000/cart/item/ITEM_ID" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

#### H. Clear Entire Cart
```bash
curl -X DELETE "http://localhost:3000/cart/clear" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

### 3.3 Test Admin Analytics

```bash
# Get cart analytics (admin only)
curl -X GET "http://localhost:3000/cart/admin/analytics" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 🧪 Step 4: Advanced Testing Scenarios

### 4.1 Stock Validation Testing

1. **Add items with high quantity:**
```bash
curl -X POST "http://localhost:3000/cart/add" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID_HERE",
    "quantity": 999,
    "size": "M",
    "color": "Black"
  }'
```

**Expected**: Error message about insufficient stock.

### 4.2 Duplicate Item Handling

1. **Add same product with same variants twice:**
```bash
# First addition
curl -X POST "http://localhost:3000/cart/add" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID_HERE",
    "quantity": 2,
    "size": "M",
    "color": "Black"
  }'

# Second addition (should merge quantities)
curl -X POST "http://localhost:3000/cart/add" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID_HERE",
    "quantity": 1,
    "size": "M",
    "color": "Black"
  }'
```

**Expected**: Single cart item with quantity = 3.

### 4.3 Different Variant Testing

1. **Add same product with different variants:**
```bash
# T-shirt in Medium Black
curl -X POST "http://localhost:3000/cart/add" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID_HERE",
    "quantity": 1,
    "size": "M",
    "color": "Black"
  }'

# Same T-shirt in Large White
curl -X POST "http://localhost:3000/cart/add" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID_HERE",
    "quantity": 1,
    "size": "L",
    "color": "White"
  }'
```

**Expected**: Two separate cart items.

---

## 🔍 Step 5: Verification Checklist

**Cart Functionality:**
- [ ] Empty cart returns proper structure
- [ ] Items can be added with variants
- [ ] Stock validation works
- [ ] Duplicate items merge correctly
- [ ] Different variants create separate items
- [ ] Cart calculations are accurate (subtotal, tax, total)
- [ ] Items can be updated (quantity, size, color)
- [ ] Items can be removed by product details
- [ ] Items can be removed by item ID
- [ ] Cart can be cleared completely
- [ ] Cart item count is accurate

**Admin Features:**
- [ ] Admin analytics endpoint works
- [ ] Proper authorization for admin endpoints

**Error Handling:**
- [ ] Invalid product IDs return 404
- [ ] Insufficient stock returns 400
- [ ] Missing authorization returns 401
- [ ] Invalid item IDs return 404

---

## 🎉 Step 6: Success Criteria

### Your cart system is working correctly if:

1. ✅ You can add products with size/color variants
2. ✅ Stock validation prevents overselling
3. ✅ Price calculations include tax (10%)
4. ✅ Cart persists between requests
5. ✅ Products show current pricing (including sales)
6. ✅ You can update item quantities and variants
7. ✅ You can remove items in multiple ways
8. ✅ Admin analytics provide cart insights

### Sample Test Results:

**Products Available:** 16 products across 4 categories
**Cart Features:** 8 endpoints fully functional
**Calculations:** Automatic subtotal, tax (10%), and total
**Variants:** Size and color support for clothing
**Admin Tools:** Cart analytics for business insights

---

## 🚀 Next Steps

After successful cart testing:

1. **Phase 5**: Order Management System
2. **Integration**: Connect cart to checkout flow
3. **Enhancement**: Add wishlist functionality
4. **Optimization**: Implement cart expiration
5. **Analytics**: Enhanced cart abandonment tracking

---

## 🆘 Troubleshooting

### Common Issues:

1. **"Product not found" errors**
   - Verify products were seeded successfully
   - Check product IDs in the database
   - Ensure products are active (`isActive: true`)

2. **"Cart not found" errors**
   - Cart is created automatically on first addition
   - Verify user authentication token is valid

3. **Stock validation errors**
   - Check product stock levels
   - Verify quantity doesn't exceed available stock

4. **Authorization errors**
   - Ensure JWT token is valid and not expired
   - Use correct Bearer token format

### Quick Debug Commands:

```bash
# Check server status
curl -X GET "http://localhost:3000/"

# Verify authentication
curl -X GET "http://localhost:3000/auth/profile" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check products exist
curl -X GET "http://localhost:3000/products" | head -20
```

---

*Testing Guide Created: September 3, 2025*
*Last Updated: September 3, 2025*
