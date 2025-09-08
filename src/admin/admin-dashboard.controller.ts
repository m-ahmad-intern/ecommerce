import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { DashboardService } from './dashboard.service';
import type { UserListQuery, UpdateUserDto } from './user-management.service';
import { UserManagementService } from './user-management.service';
import type { OrderListQuery, BulkOrderUpdate } from './order-management.service';
import { OrderManagementService } from './order-management.service';
import { ProductReportsService } from './product-reports.service';

// DTOs for request validation
class BulkUserUpdateDto {
  userIds: string[];
  operation: 'activate' | 'suspend' | 'verify';
}

class ChangeUserRoleDto {
  role: UserRole;
}

class UpdateOrderStatusDto {
  @IsEnum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
  @IsNotEmpty()
  status: string;
  
  @IsOptional()
  @IsString()
  trackingNumber?: string;
  
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

@ApiTags('Admin Dashboard')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly userManagementService: UserManagementService,
    private readonly orderManagementService: OrderManagementService,
    private readonly productReportsService: ProductReportsService,
  ) {}

  // ===== DASHBOARD OVERVIEW =====

  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Get comprehensive dashboard overview with key metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard overview retrieved successfully' })
  async getDashboardOverview(): Promise<any> {
    const data = await this.dashboardService.getDashboardOverview();
    return {
      statusCode: HttpStatus.OK,
      message: 'Dashboard overview retrieved successfully',
      data,
    };
  }

  @Get('dashboard/analytics/users')
  @ApiOperation({ summary: 'Get detailed user analytics' })
  @ApiResponse({ status: 200, description: 'User analytics retrieved successfully' })
  async getUserAnalytics(): Promise<any> {
    const data = await this.dashboardService.getUserAnalytics();
    return {
      statusCode: HttpStatus.OK,
      message: 'User analytics retrieved successfully',
      data,
    };
  }

  @Get('dashboard/analytics/products')
  @ApiOperation({ summary: 'Get detailed product analytics' })
  @ApiResponse({ status: 200, description: 'Product analytics retrieved successfully' })
  async getProductAnalytics(): Promise<any> {
    const data = await this.dashboardService.getProductAnalytics();
    return {
      statusCode: HttpStatus.OK,
      message: 'Product analytics retrieved successfully',
      data,
    };
  }

  @Get('dashboard/analytics/orders')
  @ApiOperation({ summary: 'Get detailed order analytics' })
  @ApiResponse({ status: 200, description: 'Order analytics retrieved successfully' })
  async getOrderAnalytics(): Promise<any> {
    const data = await this.dashboardService.getOrderAnalytics();
    return {
      statusCode: HttpStatus.OK,
      message: 'Order analytics retrieved successfully',
      data,
    };
  }

  @Get('dashboard/analytics/sales')
  @ApiOperation({ summary: 'Get detailed sales analytics' })
  @ApiResponse({ status: 200, description: 'Sales analytics retrieved successfully' })
  async getSalesAnalytics(): Promise<any> {
    const data = await this.dashboardService.getSalesAnalytics();
    return {
      statusCode: HttpStatus.OK,
      message: 'Sales analytics retrieved successfully',
      data,
    };
  }

  @Get('dashboard/system-metrics')
  @ApiOperation({ summary: 'Get real-time system metrics' })
  @ApiResponse({ status: 200, description: 'System metrics retrieved successfully' })
  async getSystemMetrics() {
    const data = await this.dashboardService.getSystemMetrics();
    return {
      statusCode: HttpStatus.OK,
      message: 'System metrics retrieved successfully',
      data,
    };
  }

  // ===== USER MANAGEMENT =====

  @Get('users')
  @ApiOperation({ summary: 'Get paginated list of users with filtering' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getUsers(@Query() query: UserListQuery) {
    const data = await this.userManagementService.getUsers(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Users retrieved successfully',
      data,
    };
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get detailed user information with statistics' })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetails(@Param('userId') userId: string) {
    const data = await this.userManagementService.getUserDetails(userId);
    return {
      statusCode: HttpStatus.OK,
      message: 'User details retrieved successfully',
      data,
    };
  }

  @Put('users/:userId')
  @ApiOperation({ summary: 'Update user information' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async updateUser(@Param('userId') userId: string, @Body() updateData: UpdateUserDto) {
    const data = await this.userManagementService.updateUser(userId, updateData);
    return {
      statusCode: HttpStatus.OK,
      message: 'User updated successfully',
      data,
    };
  }

  @Post('users/:userId/toggle-status')
  @ApiOperation({ summary: 'Suspend or activate user account' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot suspend super admin' })
  async toggleUserStatus(@Param('userId') userId: string) {
    const data = await this.userManagementService.toggleUserStatus(userId);
    return {
      statusCode: HttpStatus.OK,
      message: data.message,
      data,
    };
  }

  @Put('users/:userId/role')
  @Roles(UserRole.SUPER_ADMIN) // Only super admin can change roles
  @ApiOperation({ summary: 'Change user role (super admin only)' })
  @ApiResponse({ status: 200, description: 'User role changed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot change super admin role' })
  async changeUserRole(@Param('userId') userId: string, @Body() roleData: ChangeUserRoleDto) {
    const data = await this.userManagementService.changeUserRole(userId, roleData.role);
    return {
      statusCode: HttpStatus.OK,
      message: data.message,
      data,
    };
  }

  @Delete('users/:userId')
  @Roles(UserRole.SUPER_ADMIN) // Only super admin can delete users
  @ApiOperation({ summary: 'Delete user account (super admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete user with active orders' })
  async deleteUser(@Param('userId') userId: string) {
    const data = await this.userManagementService.deleteUser(userId);
    return {
      statusCode: HttpStatus.OK,
      message: data.message,
      data,
    };
  }

  @Get('users/:userId/activity')
  @ApiOperation({ summary: 'Get user activity summary' })
  @ApiResponse({ status: 200, description: 'User activity retrieved successfully' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to look back' })
  async getUserActivity(@Param('userId') userId: string, @Query('days') days: string = '30') {
    const data = await this.userManagementService.getUserActivity(userId, parseInt(days, 10));
    return {
      statusCode: HttpStatus.OK,
      message: 'User activity retrieved successfully',
      data,
    };
  }

  @Post('users/bulk-update')
  @ApiOperation({ summary: 'Bulk update users (activate, suspend, verify)' })
  @ApiResponse({ status: 200, description: 'Bulk update completed successfully' })
  async bulkUpdateUsers(@Body() bulkData: BulkUserUpdateDto) {
    const data = await this.userManagementService.bulkUpdateUsers(bulkData.userIds, bulkData.operation);
    return {
      statusCode: HttpStatus.OK,
      message: data.message,
      data,
    };
  }

  // ===== ORDER MANAGEMENT =====

  @Get('orders')
  @ApiOperation({ summary: 'Get paginated and filtered orders for admin' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'minAmount', required: false, type: Number })
  @ApiQuery({ name: 'maxAmount', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getOrders(@Query() query: OrderListQuery) {
    const data = await this.orderManagementService.getOrders(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Orders retrieved successfully',
      data,
    };
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Get detailed order information' })
  @ApiResponse({ status: 200, description: 'Order details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderDetails(@Param('orderId') orderId: string) {
    const data = await this.orderManagementService.getOrderDetails(orderId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Order details retrieved successfully',
      data,
    };
  }

  @Put('orders/:orderId/status')
  @ApiOperation({ summary: 'Update order status with notifications' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateOrderStatus(@Param('orderId') orderId: string, @Body() statusData: UpdateOrderStatusDto) {
    const data = await this.orderManagementService.updateOrderStatus(
      orderId,
      statusData.status as any,
      statusData.trackingNumber,
      statusData.adminNotes
    );
    return {
      statusCode: HttpStatus.OK,
      message: data.message,
      data,
    };
  }

  @Post('orders/bulk-update')
  @ApiOperation({ summary: 'Bulk update orders' })
  @ApiResponse({ status: 200, description: 'Bulk update completed successfully' })
  async bulkUpdateOrders(@Body() bulkUpdate: BulkOrderUpdate) {
    const data = await this.orderManagementService.bulkUpdateOrders(bulkUpdate);
    return {
      statusCode: HttpStatus.OK,
      message: data.message,
      data,
    };
  }

  @Get('orders/analytics/overview')
  @ApiOperation({ summary: 'Get comprehensive order analytics' })
  @ApiResponse({ status: 200, description: 'Order analytics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter', 'year'] })
  async getOrderAnalyticsOverview(@Query('period') period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
    const data = await this.orderManagementService.getOrderAnalytics(period);
    return {
      statusCode: HttpStatus.OK,
      message: 'Order analytics retrieved successfully',
      data,
    };
  }

  @Get('orders/analytics/trends')
  @ApiOperation({ summary: 'Get order trends and insights' })
  @ApiResponse({ status: 200, description: 'Order trends retrieved successfully' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getOrderTrends(@Query('days') days: string = '30') {
    const data = await this.orderManagementService.getOrderTrends(parseInt(days, 10));
    return {
      statusCode: HttpStatus.OK,
      message: 'Order trends retrieved successfully',
      data,
    };
  }

  @Get('orders/export')
  @ApiOperation({ summary: 'Export orders to CSV format' })
  @ApiResponse({ status: 200, description: 'Orders exported successfully' })
  async exportOrders(@Query() query: OrderListQuery) {
    const data = await this.orderManagementService.exportOrders(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Orders exported successfully',
      data,
    };
  }

  // ===== PRODUCT REPORTS & ANALYTICS =====

  @Get('products/performance')
  @ApiOperation({ summary: 'Get product performance report' })
  @ApiResponse({ status: 200, description: 'Product performance report retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter', 'year'] })
  async getProductPerformance(@Query('period') period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<any> {
    const data = await this.productReportsService.getProductPerformanceReport(period);
    return {
      statusCode: HttpStatus.OK,
      message: 'Product performance report retrieved successfully',
      data,
    };
  }

  @Get('products/inventory-report')
  @ApiOperation({ summary: 'Get detailed inventory report' })
  @ApiResponse({ status: 200, description: 'Inventory report retrieved successfully' })
  async getInventoryReport(): Promise<any> {
    const data = await this.productReportsService.getInventoryReport();
    return {
      statusCode: HttpStatus.OK,
      message: 'Inventory report retrieved successfully',
      data,
    };
  }

  @Get('products/sales-report')
  @ApiOperation({ summary: 'Get comprehensive sales report' })
  @ApiResponse({ status: 200, description: 'Sales report retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter', 'year'] })
  async getSalesReport(@Query('period') period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<any> {
    const data = await this.productReportsService.getSalesReport(period);
    return {
      statusCode: HttpStatus.OK,
      message: 'Sales report retrieved successfully',
      data,
    };
  }

  @Get('products/:productId/analytics')
  @ApiOperation({ summary: 'Get detailed analytics for a specific product' })
  @ApiResponse({ status: 200, description: 'Product analytics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductAnalyticsDetail(@Param('productId') productId: string): Promise<any> {
    const data = await this.productReportsService.getProductAnalytics(productId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Product analytics retrieved successfully',
      data,
    };
  }

  @Get('products/attention-needed')
  @ApiOperation({ summary: 'Get products that need attention (low stock, poor performance, etc.)' })
  @ApiResponse({ status: 200, description: 'Products needing attention retrieved successfully' })
  async getProductsNeedingAttention() {
    const data = await this.productReportsService.getProductsNeedingAttention();
    return {
      statusCode: HttpStatus.OK,
      message: 'Products needing attention retrieved successfully',
      data,
    };
  }

  @Get('business/recommendations')
  @ApiOperation({ summary: 'Get business recommendations for improvement' })
  @ApiResponse({ status: 200, description: 'Business recommendations retrieved successfully' })
  async getBusinessRecommendations() {
    const data = await this.productReportsService.getBusinessRecommendations();
    return {
      statusCode: HttpStatus.OK,
      message: 'Business recommendations retrieved successfully',
      data,
    };
  }
}
