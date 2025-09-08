# Phase 6 Testing Guide: Sale System & Real-time Notifications

## Overview
This guide covers testing the Sale Management System and Real-time Notification features implemented in Phase 6.

## Prerequisites
1. Server running on `http://localhost:3001`
2. MongoDB Atlas connected
3. Socket.IO client for WebSocket testing
4. Admin user credentials for restricted endpoints

## API Endpoints Testing

### Sale Management Endpoints

#### 1. Apply Sale to Specific Products
```bash
POST http://localhost:3001/sales/apply
Authorization: Bearer {admin_jwt_token}
Content-Type: application/json

{
  "productIds": ["product_id_1", "product_id_2"],
  "discountPercentage": 25,
  "startDate": "2024-01-15T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "notifyUsers": true
}
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "message": "Sale applied successfully",
  "data": {
    "success": true,
    "message": "Sale applied to 2 products",
    "products": [...]
  }
}
```

#### 2. Apply Bulk Sale by Category
```bash
POST http://localhost:3001/sales/bulk-apply
Authorization: Bearer {admin_jwt_token}
Content-Type: application/json

{
  "category": "Casual",
  "discountPercentage": 30,
  "notifyUsers": true
}
```

#### 3. Get Products on Sale
```bash
GET http://localhost:3001/sales/products?page=1&limit=10
```

#### 4. Get Sale Statistics (Admin Only)
```bash
GET http://localhost:3001/sales/statistics
Authorization: Bearer {admin_jwt_token}
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "message": "Sale statistics retrieved successfully",
  "data": {
    "totalProducts": 50,
    "productsOnSale": 15,
    "featuredProducts": 10,
    "expiredSales": 2,
    "salePercentage": 30,
    "discountStatistics": {
      "average": 25,
      "maximum": 50,
      "minimum": 10
    }
  }
}
```

#### 5. Remove Sale from Products
```bash
DELETE http://localhost:3001/sales/remove
Authorization: Bearer {admin_jwt_token}
Content-Type: application/json

{
  "productIds": ["product_id_1", "product_id_2"]
}
```

#### 6. Clean Up Expired Sales
```bash
POST http://localhost:3001/sales/cleanup-expired
Authorization: Bearer {admin_jwt_token}
```

#### 7. Schedule Future Sale
```bash
POST http://localhost:3001/sales/schedule
Authorization: Bearer {admin_jwt_token}
Content-Type: application/json

{
  "productIds": ["product_id_1"],
  "discountPercentage": 40,
  "startDate": "2024-02-01T00:00:00Z",
  "endDate": "2024-02-14T23:59:59Z"
}
```

## WebSocket Testing

### Socket.IO Connection Testing

#### 1. Basic Connection Test
```javascript
// Using Socket.IO client (browser console or Node.js)
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

#### 2. Join User Room
```javascript
socket.emit('join_user_room', {
  userId: 'user_123',
  token: 'optional_jwt_token'
});

socket.on('room_joined', (response) => {
  console.log('Room joined:', response);
  // Expected: { success: true, room: 'user:user_123', message: '...' }
});
```

#### 3. Join Admin Room (Requires Auth)
```javascript
socket.emit('join_admin_room');

socket.on('admin_room_joined', (response) => {
  console.log('Admin room joined:', response);
});
```

### Real-time Notification Testing

#### 1. Sale Notifications
When a sale is applied via API, connected clients should receive:
```javascript
socket.on('sale_notification', (notification) => {
  console.log('Sale alert:', notification);
  /*
  Expected structure:
  {
    type: 'SALE_ALERT',
    productId: '...',
    productName: '...',
    originalPrice: 100,
    salePrice: 75,
    discountPercentage: 25,
    message: '... is now on sale with 25% off!',
    timestamp: '2024-01-15T10:30:00Z'
  }
  */
});
```

#### 2. Bulk Sale Notifications
```javascript
socket.on('bulk_sale_notification', (notification) => {
  console.log('Bulk sale alert:', notification);
  /*
  Expected structure:
  {
    type: 'BULK_SALE',
    category: 'Casual',
    discountPercentage: 30,
    productCount: 15,
    message: '🔥 Flash Sale Alert! 30% off on Casual!',
    timestamp: '2024-01-15T10:30:00Z'
  }
  */
});
```

#### 3. Order Update Notifications (User-specific)
```javascript
socket.on('order_update', (notification) => {
  console.log('Order update:', notification);
  /*
  Expected structure:
  {
    type: 'ORDER_STATUS',
    orderId: '...',
    status: 'shipped',
    message: '...',
    timestamp: '2024-01-15T10:30:00Z'
  }
  */
});
```

#### 4. New Order Notifications (Admin-only)
```javascript
// Only received by users in 'admin' room
socket.on('new_order', (notification) => {
  console.log('New order received:', notification);
  /*
  Expected structure:
  {
    type: 'NEW_ORDER',
    orderId: '...',
    userId: '...',
    customerName: '...',
    totalAmount: 150,
    itemCount: 3,
    timestamp: '2024-01-15T10:30:00Z'
  }
  */
});
```

#### 5. Inventory Alerts (Admin-only)
```javascript
socket.on('inventory_alert', (notification) => {
  console.log('Low stock alert:', notification);
  /*
  Expected structure:
  {
    type: 'LOW_STOCK',
    productId: '...',
    productName: '...',
    currentStock: 5,
    threshold: 10,
    message: '... is running low on stock (5 remaining)',
    timestamp: '2024-01-15T10:30:00Z'
  }
  */
});
```

## Integration Testing Scenarios

### Scenario 1: Complete Sale Workflow
1. **Setup**: Admin logs in and gets JWT token
2. **Apply Sale**: Use `/sales/apply` endpoint to create a sale
3. **Verify WebSocket**: Check that sale notification is broadcasted
4. **Check Product**: Verify product shows updated sale price
5. **Customer View**: Get sale products via `/sales/products`
6. **Remove Sale**: Use `/sales/remove` to end sale
7. **Verify Cleanup**: Confirm sale fields are removed

### Scenario 2: Real-time Order Notifications
1. **Setup**: Admin and customer both connected via WebSocket
2. **Place Order**: Customer creates an order
3. **Admin Notification**: Verify admin receives new order notification
4. **Status Update**: Admin updates order status
5. **Customer Notification**: Verify customer receives status update

### Scenario 3: Bulk Sale Campaign
1. **Apply Bulk Sale**: Apply sale to entire category
2. **Broadcast Check**: Verify all connected users receive notification
3. **Statistics Check**: Verify sale statistics are updated
4. **Cleanup**: Remove expired sales and verify cleanup

## WebSocket Event Reference

### Client → Server Events
- `join_user_room` - Join user-specific room for notifications
- `join_admin_room` - Join admin room (requires authentication)
- `leave_room` - Leave a specific room

### Server → Client Events
- `room_joined` - Confirmation of room joining
- `admin_room_joined` - Confirmation of admin room joining
- `room_left` - Confirmation of room leaving
- `sale_notification` - Product sale alerts
- `bulk_sale_notification` - Category/bulk sale alerts
- `order_update` - Order status updates (user-specific)
- `new_order` - New order notifications (admin-only)
- `inventory_alert` - Low stock alerts (admin-only)
- `system_notification` - General system notifications

## Testing Tools

### Recommended Tools
1. **Postman/Insomnia**: For API endpoint testing
2. **Socket.IO Client**: For WebSocket testing
3. **Browser DevTools**: For real-time event monitoring
4. **MongoDB Compass**: For database verification

### Sample Socket.IO Client Test Script
```html
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Test</title>
    <script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
</head>
<body>
    <h1>E-Commerce WebSocket Test</h1>
    <div id="messages"></div>
    
    <script>
        const socket = io('http://localhost:3001');
        const messages = document.getElementById('messages');
        
        function addMessage(message) {
            const div = document.createElement('div');
            div.innerHTML = `<strong>${new Date().toLocaleTimeString()}</strong>: ${JSON.stringify(message, null, 2)}`;
            messages.appendChild(div);
        }
        
        socket.on('connect', () => {
            addMessage({ event: 'Connected', socketId: socket.id });
            
            // Join user room
            socket.emit('join_user_room', { userId: 'test_user_123' });
        });
        
        // Listen to all notification types
        ['sale_notification', 'bulk_sale_notification', 'order_update', 'new_order', 'inventory_alert'].forEach(event => {
            socket.on(event, (data) => {
                addMessage({ event, data });
            });
        });
    </script>
</body>
</html>
```

## Troubleshooting

### Common Issues
1. **CORS Errors**: Ensure CORS is properly configured in main.ts
2. **Authentication Failures**: Check JWT token validity and format
3. **WebSocket Connection Issues**: Verify Socket.IO dependencies are installed
4. **Room Not Joined**: Ensure proper room joining before testing notifications

### Debugging Commands
```bash
# Check server logs for WebSocket connections
npm run start:dev

# Verify database changes
# Use MongoDB Compass to check product schema changes

# Test basic HTTP endpoints first
curl -X GET http://localhost:3001/sales/products

# Test WebSocket connectivity
# Use browser DevTools Network tab to check WebSocket handshake
```

## Success Criteria
- ✅ All sale management endpoints respond correctly
- ✅ WebSocket connections establish successfully
- ✅ Real-time notifications are received by appropriate users
- ✅ Sale data is properly stored and retrieved from database
- ✅ Authentication and authorization work for admin endpoints
- ✅ Error handling works for invalid requests
- ✅ Swagger documentation is complete and accessible

## Next Steps After Testing
1. Performance testing with multiple concurrent connections
2. Load testing for bulk operations
3. Security testing for WebSocket authentication
4. Integration with frontend client
5. Production deployment considerations
