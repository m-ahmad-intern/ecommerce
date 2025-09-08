import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Product, ProductDocument } from '../schemas/product.schema';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Review, ReviewDocument } from '../schemas/review.schema';
import { Cart, CartDocument } from '../schemas/cart.schema';

interface DashboardOverview {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalReviews: number;
  averageOrderValue: number;
  recentGrowth: {
    usersGrowth: number;
    ordersGrowth: number;
    revenueGrowth: number;
  };
}

interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  usersByRole: Record<string, number>;
  topCustomers: Array<{
    userId: string;
    name: string;
    email: string;
    totalOrders: number;
    totalSpent: number;
  }>;
}

interface ProductAnalytics {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  productsOnSale: number;
  topSellingProducts: Array<{
    productId: string;
    name: string;
    totalSold: number;
    revenue: number;
    category: string;
  }>;
  categoryDistribution: Record<string, number>;
}

interface OrderAnalytics {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
  orderStatusDistribution: Record<string, number>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
}

interface SalesAnalytics {
  totalSales: number;
  activeSales: number;
  totalDiscountGiven: number;
  averageDiscountPercentage: number;
  salesByCategory: Record<string, number>;
  mostDiscountedProducts: Array<{
    productId: string;
    name: string;
    originalPrice: number;
    salePrice: number;
    discountPercentage: number;
  }>;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
  ) {}

  /**
   * Get comprehensive dashboard overview
   */
  async getDashboardOverview(): Promise<DashboardOverview> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    // Get current totals
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalReviews,
      revenueData,
      // Growth data
      usersLastMonth,
      ordersLastMonth,
      revenueLastMonth
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.productModel.countDocuments({ isActive: true }),
      this.orderModel.countDocuments(),
      this.reviewModel.countDocuments(),
      this.orderModel.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      // Growth calculations
      this.userModel.countDocuments({ createdAt: { $gte: lastMonth } }),
      this.orderModel.countDocuments({ createdAt: { $gte: lastMonth } }),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: lastMonth }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    const totalRevenue = revenueData[0]?.total || 0;
    const totalOrdersCount = revenueData[0]?.count || 0;
    const averageOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

    // Calculate growth percentages
    const revenueThisMonth = revenueLastMonth[0]?.total || 0;
    const usersGrowth = totalUsers > 0 ? (usersLastMonth / totalUsers) * 100 : 0;
    const ordersGrowth = totalOrders > 0 ? (ordersLastMonth / totalOrders) * 100 : 0;
    const revenueGrowth = totalRevenue > 0 ? (revenueThisMonth / totalRevenue) * 100 : 0;

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      totalReviews,
      averageOrderValue,
      recentGrowth: {
        usersGrowth: Math.round(usersGrowth * 100) / 100,
        ordersGrowth: Math.round(ordersGrowth * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      },
    };
  }

  /**
   * Get detailed user analytics
   */
  async getUserAnalytics(): Promise<UserAnalytics> {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersThisMonth,
      usersByRole,
      topCustomersData
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ createdAt: { $gte: thisMonth } }),
      this.userModel.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      this.orderModel.aggregate([
        {
          $match: { status: { $ne: 'cancelled' } }
        },
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
        {
          $unwind: '$user'
        },
        {
          $project: {
            userId: '$_id',
            name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
            email: '$user.email',
            totalOrders: 1,
            totalSpent: 1
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Process role distribution
    const roleDistribution: Record<string, number> = {};
    usersByRole.forEach(role => {
      roleDistribution[role._id] = role.count;
    });

    return {
      totalUsers,
      activeUsers: totalUsers, // For now, consider all users as active
      newUsersThisMonth,
      usersByRole: roleDistribution,
      topCustomers: topCustomersData,
    };
  }

  /**
   * Get detailed product analytics
   */
  async getProductAnalytics(): Promise<ProductAnalytics> {
    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      productsOnSale,
      categoryDistribution,
      topSellingProducts
    ] = await Promise.all([
      this.productModel.countDocuments(),
      this.productModel.countDocuments({ isActive: true }),
      this.productModel.countDocuments({ stock: { $lt: 10 }, isActive: true }),
      this.productModel.countDocuments({ isOnSale: true, isActive: true }),
      this.productModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      // Get top selling products from order items
      this.orderModel.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            totalSold: { $sum: '$items.quantity' },
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
            name: '$product.name',
            category: '$product.category',
            totalSold: 1,
            revenue: 1
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Process category distribution
    const categoryDist: Record<string, number> = {};
    categoryDistribution.forEach(cat => {
      categoryDist[cat._id] = cat.count;
    });

    return {
      totalProducts,
      activeProducts,
      lowStockProducts,
      productsOnSale,
      topSellingProducts,
      categoryDistribution: categoryDist,
    };
  }

  /**
   * Get detailed order analytics
   */
  async getOrderAnalytics(): Promise<OrderAnalytics> {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastSixMonths = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    const [
      totalOrders,
      orderStatusData,
      revenueData,
      ordersThisMonth,
      revenueThisMonth,
      monthlyData
    ] = await Promise.all([
      this.orderModel.countDocuments(),
      this.orderModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      this.orderModel.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      this.orderModel.countDocuments({ createdAt: { $gte: thisMonth } }),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: thisMonth }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: lastSixMonths } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    // Process status distribution
    const statusDistribution: Record<string, number> = {};
    orderStatusData.forEach(status => {
      statusDistribution[status._id] = status.count;
    });

    const totalRevenue = revenueData[0]?.total || 0;
    const totalOrdersCount = revenueData[0]?.count || 0;
    const averageOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

    // Process monthly data
    const monthlyRevenue = monthlyData.map(month => ({
      month: `${month._id.year}-${month._id.month.toString().padStart(2, '0')}`,
      revenue: month.revenue,
      orders: month.orders
    }));

    return {
      totalOrders,
      pendingOrders: statusDistribution['pending'] || 0,
      completedOrders: statusDistribution['delivered'] || 0,
      cancelledOrders: statusDistribution['cancelled'] || 0,
      totalRevenue,
      averageOrderValue,
      ordersThisMonth,
      revenueThisMonth: revenueThisMonth[0]?.total || 0,
      orderStatusDistribution: statusDistribution,
      monthlyRevenue,
    };
  }

  /**
   * Get sales analytics
   */
  async getSalesAnalytics(): Promise<SalesAnalytics> {
    const [
      totalSales,
      activeSales,
      salesData,
      categoryData,
      topDiscountedProducts
    ] = await Promise.all([
      this.productModel.countDocuments({ isOnSale: true }),
      this.productModel.countDocuments({ isOnSale: true, isActive: true }),
      this.productModel.aggregate([
        { $match: { isOnSale: true, discountPercentage: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            totalDiscount: { $sum: { $multiply: ['$price', { $divide: ['$discountPercentage', 100] }] } },
            avgDiscount: { $avg: '$discountPercentage' }
          }
        }
      ]),
      this.productModel.aggregate([
        { $match: { isOnSale: true, isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      this.productModel.find({ isOnSale: true, isActive: true })
        .sort({ discountPercentage: -1 })
        .limit(10)
        .select('name price salePrice discountPercentage')
    ]);

    // Process category data
    const salesByCategory: Record<string, number> = {};
    categoryData.forEach(cat => {
      salesByCategory[cat._id] = cat.count;
    });

    // Process most discounted products
    const mostDiscountedProducts = topDiscountedProducts.map(product => ({
      productId: (product._id as any).toString(),
      name: product.name,
      originalPrice: product.price,
      salePrice: product.salePrice || 0,
      discountPercentage: product.discountPercentage || 0,
    }));

    return {
      totalSales,
      activeSales,
      totalDiscountGiven: salesData[0]?.totalDiscount || 0,
      averageDiscountPercentage: salesData[0]?.avgDiscount || 0,
      salesByCategory,
      mostDiscountedProducts,
    };
  }

  /**
   * Get real-time system metrics
   */
  async getSystemMetrics() {
    const [
      activeCartsCount,
      reviewsThisMonth,
      averageRating
    ] = await Promise.all([
      this.cartModel.countDocuments({ items: { $ne: [] } }),
      this.reviewModel.countDocuments({
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      }),
      this.reviewModel.aggregate([
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ])
    ]);

    return {
      activeCarts: activeCartsCount,
      reviewsThisMonth,
      averageRating: averageRating[0]?.avgRating || 0,
      serverUptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
