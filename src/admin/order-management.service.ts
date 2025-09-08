import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from '../schemas/order.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Product, ProductDocument } from '../schemas/product.schema';
import { NotificationService } from '../notifications/notification.service';

export interface OrderListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'createdAt' | 'totalAmount' | 'orderNumber';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topCustomers: Array<{
    userId: string;
    customerName: string;
    totalOrders: number;
    totalSpent: number;
  }>;
  ordersByStatus: Record<string, number>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
}

export interface BulkOrderUpdate {
  orderIds: string[];
  status: OrderStatus;
  trackingNumber?: string;
  notes?: string;
}

@Injectable()
export class OrderManagementService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private notificationService: NotificationService,
  ) {}

  /**
   * Get paginated and filtered orders for admin
   */
  async getOrders(query: OrderListQuery) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const skip = (page - 1) * limit;

    // Build filter criteria
    const filter: any = {};

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.firstName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.lastName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.email': { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      filter.total = {};
      if (minAmount !== undefined) {
        filter.total.$gte = minAmount;
      }
      if (maxAmount !== undefined) {
        filter.total.$lte = maxAmount;
      }
    }

    // Build sort criteria
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('userId', 'firstName lastName email')
        .populate('items.productId', 'name images')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.orderModel.countDocuments(filter)
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get detailed order information
   */
  async getOrderDetails(orderId: string) {
    const order = await this.orderModel
      .findById(orderId)
      .populate('userId', 'firstName lastName email phone')
      .populate('items.productId', 'name images price category')
      .lean();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Update order status with notifications
   */
  async updateOrderStatus(
    orderId: string, 
    status: OrderStatus, 
    trackingNumber?: string,
    adminNotes?: string
  ) {
    const order = await this.orderModel.findById(orderId).populate('userId', 'firstName lastName');

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updateData: any = { status };
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true }
    ).populate('userId', 'firstName lastName');

    // Send notification to customer
    if (updatedOrder) {
      await this.notificationService.sendOrderStatusUpdate(
        updatedOrder.userId._id.toString(),
        {
          orderId: (updatedOrder._id as any).toString(),
          status: updatedOrder.status,
          trackingNumber: (updatedOrder as any).trackingNumber,
        }
      );
    }

    return {
      order: updatedOrder,
      message: `Order status updated to ${status}`,
    };
  }

  /**
   * Bulk update orders
   */
  async bulkUpdateOrders(bulkUpdate: BulkOrderUpdate) {
    const { orderIds, status, trackingNumber, notes } = bulkUpdate;

    if (!orderIds || orderIds.length === 0) {
      throw new BadRequestException('Order IDs are required');
    }

    const updateData: any = { status };
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }
    if (notes) {
      updateData.adminNotes = notes;
    }

    // Get orders before update for notifications
    const orders = await this.orderModel
      .find({ _id: { $in: orderIds } })
      .populate('userId', 'firstName lastName')
      .lean();

    const result = await this.orderModel.updateMany(
      { _id: { $in: orderIds } },
      { $set: updateData }
    );

    // Send notifications to customers
    for (const order of orders) {
      await this.notificationService.sendOrderStatusUpdate(
        order.userId._id.toString(),
        {
          orderId: order._id.toString(),
          status,
          trackingNumber,
        }
      );
    }

    return {
      success: true,
      affectedOrders: result.modifiedCount,
      status,
      message: `${result.modifiedCount} orders updated to ${status}`,
    };
  }

  /**
   * Get comprehensive order analytics
   */
  async getOrderAnalytics(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<OrderAnalytics> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const [
      orderStats,
      topCustomers,
      ordersByStatus,
      revenueByMonth,
      topProducts
    ] = await Promise.all([
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' }
          }
        }
      ]),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: '$userId',
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$_id',
            customerName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
            totalOrders: 1,
            totalSpent: 1
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 }
      ]),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            quantitySold: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $project: {
            productId: '$_id',
            productName: '$product.name',
            quantitySold: 1,
            revenue: 1
          }
        },
        { $sort: { quantitySold: -1 } },
        { $limit: 10 }
      ])
    ]);

    const stats = orderStats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 };

    // Process status distribution
    const statusDistribution: Record<string, number> = {};
    ordersByStatus.forEach(status => {
      statusDistribution[status._id] = status.count;
    });

    // Process monthly revenue
    const monthlyRevenue = revenueByMonth.map(month => ({
      month: `${month._id.year}-${month._id.month.toString().padStart(2, '0')}`,
      revenue: month.revenue,
      orders: month.orders
    }));

    return {
      totalOrders: stats.totalOrders,
      totalRevenue: stats.totalRevenue,
      averageOrderValue: Math.round(stats.averageOrderValue * 100) / 100,
      topCustomers,
      ordersByStatus: statusDistribution,
      revenueByMonth: monthlyRevenue,
      topProducts,
    };
  }

  /**
   * Export orders to CSV format
   */
  async exportOrders(query: OrderListQuery) {
    const { orders } = await this.getOrders({ ...query, limit: 10000, page: 1 });

    const csvData = orders.map(order => ({
      orderNumber: order.orderNumber,
      customerName: `${(order.userId as any)?.firstName || ''} ${(order.userId as any)?.lastName || ''}`.trim(),
      customerEmail: (order.userId as any)?.email || '',
      status: order.status,
      totalAmount: (order as any).total,
      itemCount: order.items.length,
      orderDate: (order as any).createdAt,
      shippingAddress: `${(order.shippingAddress as any).streetAddress}, ${(order.shippingAddress as any).city}, ${(order.shippingAddress as any).country}`,
      trackingNumber: (order as any).trackingNumber || '',
    }));

    return {
      data: csvData,
      headers: [
        'Order Number',
        'Customer Name',
        'Customer Email',
        'Status',
        'Total Amount',
        'Item Count',
        'Order Date',
        'Shipping Address',
        'Tracking Number'
      ],
      filename: `orders_export_${new Date().toISOString().split('T')[0]}.csv`
    };
  }

  /**
   * Get order trends and insights
   */
  async getOrderTrends(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      dailyOrders,
      hourlyDistribution,
      statusTrends
    ] = await Promise.all([
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              status: '$status',
              date: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
              }
            },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    return {
      period: `Last ${days} days`,
      dailyOrders: dailyOrders.map(day => ({
        date: `${day._id.year}-${day._id.month.toString().padStart(2, '0')}-${day._id.day.toString().padStart(2, '0')}`,
        orders: day.orders,
        revenue: day.revenue
      })),
      hourlyDistribution: hourlyDistribution.map(hour => ({
        hour: hour._id,
        orders: hour.orders
      })),
      peakHour: hourlyDistribution.reduce((max, hour) => 
        hour.orders > max.orders ? hour : max, 
        { _id: 0, orders: 0 }
      )._id,
      statusTrends
    };
  }

  /**
   * Get abandoned carts that might convert to orders
   */
  async getAbandonedCarts() {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // This would require access to cart model, but shows the concept
    return {
      message: 'Abandoned cart analysis requires cart data integration',
      suggestedActions: [
        'Send reminder emails to users with items in cart',
        'Offer discount for cart completion',
        'Follow up with personalized recommendations'
      ]
    };
  }
}
