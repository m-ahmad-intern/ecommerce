### Phase 4: Cart Management System Test Endpoints

All endpoints require authentication (Bearer token in Authorization header)

#### 1. Get User Cart
```http
GET http://localhost:3000/cart
Authorization: Bearer YOUR_JWT_TOKEN
```

#### 2. Get Cart Item Count
```http
GET http://localhost:3000/cart/count
Authorization: Bearer YOUR_JWT_TOKEN
```

#### 3. Add Item to Cart
```http
POST http://localhost:3000/cart/add
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "productId": "PRODUCT_ID_HERE",
  "quantity": 2,
  "size": "M",
  "color": "Blue"
}
```

#### 4. Update Cart Item
```http
PUT http://localhost:3000/cart/item/CART_ITEM_ID
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "quantity": 3,
  "size": "L",
  "color": "Red"
}
```

#### 5. Remove Specific Item from Cart (by product details)
```http
DELETE http://localhost:3000/cart/remove
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "productId": "PRODUCT_ID_HERE",
  "size": "M",
  "color": "Blue"
}
```

#### 6. Remove Cart Item (by item ID)
```http
DELETE http://localhost:3000/cart/item/CART_ITEM_ID
Authorization: Bearer YOUR_JWT_TOKEN
```

#### 7. Clear Entire Cart
```http
DELETE http://localhost:3000/cart/clear
Authorization: Bearer YOUR_JWT_TOKEN
```

#### 8. Admin: Get Cart Analytics (Admin/Super Admin only)
```http
GET http://localhost:3000/cart/admin/analytics
Authorization: Bearer ADMIN_JWT_TOKEN
```

### Test Flow:
1. First, register/login to get JWT token
2. Get products list to find product IDs
3. Add items to cart using product IDs
4. Get cart to see added items
5. Update item quantities/variants
6. Remove specific items
7. Clear cart when done

### Expected Responses:

**Get Cart Response:**
```json
{
  "_id": "cart_id",
  "user": "user_id",
  "items": [
    {
      "_id": "item_id",
      "product": {
        "_id": "product_id",
        "name": "Product Name",
        "price": 29.99,
        "images": ["image_url"]
      },
      "quantity": 2,
      "size": "M",
      "color": "Blue",
      "price": 29.99
    }
  ],
  "totalAmount": 59.98,
  "totalItems": 2,
  "taxAmount": 5.40,
  "finalAmount": 65.38
}
```

**Cart Analytics Response (Admin only):**
```json
{
  "totalCarts": 150,
  "activeCarts": 45,
  "averageCartValue": 125.50,
  "totalCartValue": 18825.00,
  "topProducts": [
    {
      "_id": "product_id",
      "name": "Popular Product",
      "totalQuantity": 25,
      "totalRevenue": 750.00
    }
  ]
}
```
