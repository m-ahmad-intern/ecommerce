import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';

import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto, OrderFilterDto, OrderStatus } from './dto/order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../schemas/user.schema';
import type { UserDocument } from '../../schemas/user.schema';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // User Endpoints

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create order from cart (checkout)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - cart empty or insufficient stock' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkout(@CurrentUser() user: UserDocument, @Body() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.createOrderFromCart((user as any)._id.toString(), createOrderDto);
    return {
      success: true,
      message: 'Order created successfully',
      data: order,
      orderNumber: order.orderNumber,
      total: order.total,
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    };
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Get user order history' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus, description: 'Filter by order status' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field (default: createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order (default: desc)' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyOrders(@CurrentUser() user: UserDocument, @Query() filterDto: OrderFilterDto) {
    try {
      const result = await this.ordersService.getUserOrders((user as any)._id.toString(), filterDto);
      return {
        success: true,
        message: 'Orders retrieved successfully',
        data: result.orders,
        pagination: result.pagination,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('my-orders/:id')
  @ApiOperation({ summary: 'Get specific order details' })
  @ApiResponse({ status: 200, description: 'Order details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyOrder(@CurrentUser() user: UserDocument, @Param('id') orderId: string) {
    try {
      const order = await this.ordersService.getOrderById((user as any)._id.toString(), orderId);
      return {
        success: true,
        message: 'Order details retrieved successfully',
        data: order,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Admin Endpoints

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: Get all orders' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus, description: 'Filter by order status' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field (default: createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order (default: desc)' })
  @ApiResponse({ status: 200, description: 'All orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAllOrders(@Query() filterDto: OrderFilterDto) {
    try {
      const result = await this.ordersService.getAllOrders(filterDto);
      return {
        success: true,
        message: 'All orders retrieved successfully',
        data: result.orders,
        pagination: result.pagination,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: Get any order details' })
  @ApiResponse({ status: 200, description: 'Order details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getOrderDetails(@Param('id') orderId: string) {
    try {
      const order = await this.ordersService.getAnyOrderById(orderId);
      return {
        success: true,
        message: 'Order details retrieved successfully',
        data: order,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Put('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: Update order status' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid status transition' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    try {
      const result = await this.ordersService.updateOrderStatus(orderId, updateOrderStatusDto);
      return {
        success: true,
        message: 'Order status updated successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('admin/statistics/overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: Get order statistics' })
  @ApiResponse({ status: 200, description: 'Order statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getOrderStatistics() {
    try {
      const statistics = await this.ordersService.getOrderStatistics();
      return {
        success: true,
        message: 'Order statistics retrieved successfully',
        data: statistics,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Utility endpoint for order status options
  @Get('status-options')
  @ApiOperation({ summary: 'Get available order status options' })
  @ApiResponse({ status: 200, description: 'Order status options retrieved successfully' })
  async getOrderStatusOptions() {
    return {
      success: true,
      message: 'Order status options retrieved successfully',
      data: {
        statuses: Object.values(OrderStatus),
        descriptions: {
          [OrderStatus.PENDING]: 'Order placed, awaiting confirmation',
          [OrderStatus.CONFIRMED]: 'Order confirmed, preparing for processing',
          [OrderStatus.PROCESSING]: 'Order is being processed',
          [OrderStatus.SHIPPED]: 'Order has been shipped',
          [OrderStatus.DELIVERED]: 'Order delivered successfully',
          [OrderStatus.CANCELLED]: 'Order cancelled',
        },
      },
    };
  }
}
