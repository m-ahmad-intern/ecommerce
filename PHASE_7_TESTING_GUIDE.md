# Phase 7: Admin Dashboard APIs - Testing Guide

## Overview
Phase 7 implements comprehensive admin dashboard functionality with business intelligence, user management, order processing, and product analytics. This guide covers testing all admin features.

## Authentication Required
All admin endpoints require authentication with admin or super-admin roles:
- Header: `Authorization: Bearer <jwt_token>`
- Required Role: `admin` or `super-admin`

## Testing Endpoints

### 1. Dashboard Analytics

#### Get Dashboard Overview
```bash
GET /admin/dashboard/overview
# Returns: Users count, products count, orders stats, revenue, growth metrics
```

#### User Analytics
```bash
GET /admin/analytics/users
# Returns: User growth, activity patterns, registration trends

GET /admin/analytics/users/growth?period=monthly
# Returns: User growth data for specified period (daily/weekly/monthly/yearly)
```

#### Product Analytics
```bash
GET /admin/analytics/products
# Returns: Product performance, top sellers, category analysis

GET /admin/analytics/products/performance
# Returns: Detailed product performance metrics

GET /admin/analytics/products/categories
# Returns: Category-wise sales and product distribution
```

#### Order Analytics
```bash
GET /admin/analytics/orders
# Returns: Order trends, status distribution, processing times

GET /admin/analytics/orders/trends?period=monthly
# Returns: Order trends for specified period
```

#### Sales Analytics
```bash
GET /admin/analytics/sales
# Returns: Revenue trends, payment method analysis, customer segments

GET /admin/analytics/sales/revenue?period=monthly
# Returns: Revenue data for specified period

GET /admin/analytics/sales/top-customers
# Returns: Top customers by purchase value
```

#### System Metrics
```bash
GET /admin/system/metrics
# Returns: System performance, database stats, activity levels
```

### 2. User Management

#### List Users with Filters
```bash
GET /admin/users?page=1&limit=10&role=customer&status=active&search=john
# Query params: page, limit, role, status, search, sortBy, sortOrder
```

#### Get User Details
```bash
GET /admin/users/:userId
# Returns: Complete user profile with activity statistics
```

#### Update User
```bash
PUT /admin/users/:userId
{
  "email": "updated@email.com",
  "firstName": "Updated",
  "lastName": "Name",
  "role": "admin"
}
```

#### Update User Role
```bash
PATCH /admin/users/:userId/role
{
  "role": "admin"
}
```

#### Suspend/Activate User
```bash
PATCH /admin/users/:userId/suspend
{
  "reason": "Policy violation"
}

PATCH /admin/users/:userId/activate
```

#### Delete User
```bash
DELETE /admin/users/:userId
```

#### Bulk Operations
```bash
POST /admin/users/bulk-update
{
  "userIds": ["userId1", "userId2"],
  "updates": {
    "status": "suspended"
  }
}

DELETE /admin/users/bulk-delete
{
  "userIds": ["userId1", "userId2"]
}
```

#### Export Users
```bash
GET /admin/users/export?format=csv&filters[role]=customer
# Returns: CSV file download with user data
```

### 3. Order Management

#### List Orders with Advanced Filtering
```bash
GET /admin/orders?page=1&limit=10&status=pending&startDate=2024-01-01&endDate=2024-12-31
# Query params: page, limit, status, customerId, startDate, endDate, minAmount, maxAmount, sortBy, sortOrder
```

#### Get Order Details
```bash
GET /admin/orders/:orderId
# Returns: Complete order details with customer info and analytics
```

#### Update Order Status
```bash
PATCH /admin/orders/:orderId/status
{
  "status": "shipped",
  "trackingNumber": "TRACK123456"
}
```

#### Bulk Status Update
```bash
POST /admin/orders/bulk-status-update
{
  "orderIds": ["orderId1", "orderId2"],
  "status": "shipped"
}
```

#### Order Analytics by Customer
```bash
GET /admin/orders/customer/:customerId/analytics
# Returns: Customer-specific order analytics and insights
```

#### Export Orders
```bash
GET /admin/orders/export?format=csv&status=completed
# Returns: CSV file download with order data
```

#### Order Trends Analysis
```bash
GET /admin/orders/trends?period=weekly&metric=count
# Returns: Order trends analysis for specified period and metric
```

### 4. Product Reports & Analytics

#### Product Performance Report
```bash
GET /admin/reports/products/performance?page=1&limit=10&sortBy=revenue&sortOrder=desc
# Returns: Product performance metrics with revenue, units sold, ratings
```

#### Low Stock Report
```bash
GET /admin/reports/products/low-stock?threshold=10
# Returns: Products with stock below threshold
```

#### Inventory Report
```bash
GET /admin/reports/products/inventory
# Returns: Complete inventory status and valuation
```

#### Sales Analysis by Product
```bash
GET /admin/reports/products/:productId/sales-analysis?period=monthly
# Returns: Detailed sales analysis for specific product
```

#### Category Performance
```bash
GET /admin/reports/products/category-performance
# Returns: Performance metrics grouped by category
```

#### Revenue Analysis
```bash
GET /admin/reports/products/revenue-analysis?period=monthly
# Returns: Revenue analysis with trends and comparisons
```

#### Business Recommendations
```bash
GET /admin/reports/products/recommendations
# Returns: AI-driven business recommendations for products
```

#### Export Product Reports
```bash
GET /admin/reports/products/export?type=performance&format=csv
# Returns: CSV export of product reports
```

## Testing Scenarios

### 1. Dashboard Load Testing
```bash
# Test dashboard overview performance
curl -H "Authorization: Bearer <token>" \
     -X GET http://localhost:3000/admin/dashboard/overview

# Test multiple analytics endpoints
curl -H "Authorization: Bearer <token>" \
     -X GET http://localhost:3000/admin/analytics/users &
curl -H "Authorization: Bearer <token>" \
     -X GET http://localhost:3000/admin/analytics/products &
curl -H "Authorization: Bearer <token>" \
     -X GET http://localhost:3000/admin/analytics/orders &
```

### 2. User Management Workflow
```bash
# 1. List users
# 2. Create new user
# 3. Update user details
# 4. Change user role
# 5. Suspend user
# 6. Export user data
# 7. Delete user
```

### 3. Order Processing Workflow
```bash
# 1. List pending orders
# 2. View order details
# 3. Update order status to processing
# 4. Add tracking information
# 5. Bulk update multiple orders
# 6. Generate order reports
```

### 4. Product Analytics Workflow
```bash
# 1. View product performance
# 2. Check low stock items
# 3. Analyze category performance
# 4. Generate revenue reports
# 5. Export analytics data
```

## Error Handling Tests

### Test Authentication
```bash
# No token
GET /admin/dashboard/overview
# Expected: 401 Unauthorized

# Invalid token
GET /admin/dashboard/overview
Authorization: Bearer invalid_token
# Expected: 401 Unauthorized

# Non-admin user
GET /admin/dashboard/overview
Authorization: Bearer <customer_token>
# Expected: 403 Forbidden
```

### Test Validation
```bash
# Invalid user update
PUT /admin/users/:userId
{
  "email": "invalid-email"
}
# Expected: 400 Bad Request with validation errors

# Invalid pagination
GET /admin/users?page=-1&limit=1000
# Expected: 400 Bad Request

# Invalid date range
GET /admin/orders?startDate=2024-12-31&endDate=2024-01-01
# Expected: 400 Bad Request
```

## Performance Benchmarks

### Expected Response Times
- Dashboard Overview: < 500ms
- User List (50 users): < 300ms
- Order List (100 orders): < 400ms
- Product Analytics: < 600ms
- Export Operations: < 2s for 1000 records

### Database Query Optimization
- All list endpoints use indexed fields
- Aggregation pipelines optimized for performance
- Pagination implemented for all list operations
- Proper sorting and filtering on indexed fields

## Real-time Testing

### WebSocket Notifications
```bash
# Connect to WebSocket
wscat -c ws://localhost:3000

# Test order status updates
# Update order status via API and verify WebSocket notification
```

## Security Testing

### Role-based Access Control
- Test all endpoints with different user roles
- Verify admin-only access to sensitive operations
- Test bulk operations security
- Validate data export permissions

### Data Validation
- Test all input fields with invalid data
- Verify SQL injection protection
- Test XSS prevention in search fields
- Validate file upload security (exports)

## Production Readiness Checklist

- [ ] All endpoints respond within acceptable time limits
- [ ] Proper error handling and validation
- [ ] Authentication and authorization working
- [ ] Real-time notifications functioning
- [ ] Export functionality working
- [ ] Bulk operations performing efficiently
- [ ] Analytics data accuracy verified
- [ ] Security measures in place
- [ ] Performance benchmarks met
- [ ] WebSocket connections stable

## Next Steps

After completing Phase 7 testing:
1. Verify all admin functionality
2. Test dashboard performance under load
3. Validate business intelligence accuracy
4. Proceed to Phase 8: Error Handling, Validation & Security
