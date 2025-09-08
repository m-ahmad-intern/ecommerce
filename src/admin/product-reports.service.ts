import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument, ProductCategory } from '../schemas/product.schema';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Review, ReviewDocument } from '../schemas/review.schema';

interface ProductPerformance {
  productId: string;
  name: string;
  category: ProductCategory;
  totalSold: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
  conversionRate: number;
  profitMargin?: number;
}

interface InventoryReport {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalInventoryValue: number;
  categoryBreakdown: Record<string, {
    count: number;
    totalValue: number;
    averagePrice: number;
  }>;
  stockAlerts: Array<{
    productId: string;
    name: string;
    currentStock: number;
    category: string;
    lastOrderDate?: Date;
  }>;
}

interface SalesReport {
  period: string;
  totalRevenue: number;
  totalUnitsSold: number;
  topPerformingProducts: ProductPerformance[];
  categoryPerformance: Record<string, {
    revenue: number;
    unitsSold: number;
    averagePrice: number;
    growthRate: number;
  }>;
  salesTrends: Array<{
    date: string;
    revenue: number;
    unitsSold: number;
  }>;
}

interface ProductAnalytics {
  totalViews: number; // Would need view tracking
  totalSales: number;
  conversionRate: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  recentReviews: ReviewDocument[];
  priceHistory: Array<{
    date: Date;
    price: number;
    salePrice?: number;
  }>;
  competitorAnalysis?: {
    averageMarketPrice: number;
    pricePosition: 'above' | 'below' | 'competitive';
  };
}

@Injectable()
export class ProductReportsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
  ) {}

  /**
   * Get comprehensive product performance report
   */
  async getProductPerformanceReport(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<ProductPerformance[]> {
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

    const productPerformance = await this.orderModel.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orderCount: { $sum: 1 }
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
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'productId',
          as: 'reviews'
        }
      },
      {
        $project: {
          productId: '$_id',
          name: '$product.name',
          category: '$product.category',
          totalSold: 1,
          revenue: 1,
          orderCount: 1,
          averageRating: '$product.averageRating',
          reviewCount: '$product.totalReviews',
          currentPrice: '$product.price',
          conversionRate: { $multiply: [{ $divide: ['$orderCount', { $add: ['$orderCount', 100] }] }, 100] } // Simplified calculation
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    return productPerformance;
  }

  /**
   * Get detailed inventory report
   */
  async getInventoryReport(): Promise<InventoryReport> {
    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      categoryData,
      stockAlerts
    ] = await Promise.all([
      this.productModel.countDocuments(),
      this.productModel.countDocuments({ isActive: true }),
      this.productModel.countDocuments({ stock: { $lt: 10, $gt: 0 }, isActive: true }),
      this.productModel.countDocuments({ stock: 0, isActive: true }),
      this.productModel.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$price', '$stock'] } },
            averagePrice: { $avg: '$price' }
          }
        }
      ]),
      this.productModel.find({
        $or: [
          { stock: { $lt: 10 } },
          { stock: 0 }
        ],
        isActive: true
      }).select('name category stock').lean()
    ]);

    // Calculate total inventory value
    const totalInventoryValue = await this.productModel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
        }
      }
    ]);

    // Process category breakdown
    const categoryBreakdown: Record<string, any> = {};
    categoryData.forEach(cat => {
      categoryBreakdown[cat._id] = {
        count: cat.count,
        totalValue: cat.totalValue,
        averagePrice: Math.round(cat.averagePrice * 100) / 100
      };
    });

    return {
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalInventoryValue: totalInventoryValue[0]?.totalValue || 0,
      categoryBreakdown,
      stockAlerts: stockAlerts.map(product => ({
        productId: (product._id as any).toString(),
        name: product.name,
        currentStock: product.stock,
        category: product.category,
      }))
    };
  }

  /**
   * Get comprehensive sales report
   */
  async getSalesReport(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<SalesReport> {
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
      totalStats,
      topProducts,
      categoryPerformance,
      salesTrends
    ] = await Promise.all([
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            totalUnitsSold: { $sum: '$items.quantity' }
          }
        }
      ]),
      this.getProductPerformanceReport(period),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $group: {
            _id: '$product.category',
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            unitsSold: { $sum: '$items.quantity' },
            averagePrice: { $avg: '$items.price' }
          }
        }
      ]),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            unitsSold: { $sum: '$items.quantity' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ])
    ]);

    const stats = totalStats[0] || { totalRevenue: 0, totalUnitsSold: 0 };

    // Process category performance
    const categoryPerf: Record<string, any> = {};
    categoryPerformance.forEach(cat => {
      categoryPerf[cat._id] = {
        revenue: cat.revenue,
        unitsSold: cat.unitsSold,
        averagePrice: Math.round(cat.averagePrice * 100) / 100,
        growthRate: 0 // Would need historical data to calculate
      };
    });

    // Process sales trends
    const trends = salesTrends.map(trend => ({
      date: `${trend._id.year}-${trend._id.month.toString().padStart(2, '0')}-${trend._id.day.toString().padStart(2, '0')}`,
      revenue: trend.revenue,
      unitsSold: trend.unitsSold
    }));

    return {
      period,
      totalRevenue: stats.totalRevenue,
      totalUnitsSold: stats.totalUnitsSold,
      topPerformingProducts: topProducts.slice(0, 10),
      categoryPerformance: categoryPerf,
      salesTrends: trends
    };
  }

  /**
   * Get detailed analytics for a specific product
   */
  async getProductAnalytics(productId: string): Promise<ProductAnalytics> {
    const [
      product,
      salesData,
      reviews,
      ratingDistribution
    ] = await Promise.all([
      this.productModel.findById(productId).lean(),
      this.orderModel.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $match: { 'items.productId': productId } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          }
        }
      ]),
      this.reviewModel.find({ productId }).sort({ createdAt: -1 }).limit(10).populate('userId', 'firstName lastName'),
      this.reviewModel.aggregate([
        { $match: { productId } },
        { $group: { _id: '$rating', count: { $sum: 1 } } }
      ])
    ]);

    if (!product) {
      throw new Error('Product not found');
    }

    const sales = salesData[0] || { totalSales: 0, revenue: 0 };

    // Process rating distribution
    const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach(rating => {
      ratingDist[rating._id] = rating.count;
    });

    return {
      totalViews: 0, // Would need view tracking implementation
      totalSales: sales.totalSales,
      conversionRate: 0, // Would need view data
      averageRating: product.averageRating || 0,
      ratingDistribution: ratingDist,
      recentReviews: reviews,
      priceHistory: [
        {
          date: (product as any).createdAt,
          price: product.price,
          salePrice: product.salePrice
        }
      ], // Would need price history tracking
    };
  }

  /**
   * Get products that need attention (low stock, poor performance, etc.)
   */
  async getProductsNeedingAttention() {
    const [
      lowStockProducts,
      poorPerformingProducts,
      noReviewProducts,
      overStockedProducts
    ] = await Promise.all([
      this.productModel.find({
        stock: { $lt: 10 },
        isActive: true
      }).select('name stock category').lean(),
      
      // Products with low sales in the last month
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            totalSold: { $sum: '$items.quantity' }
          }
        },
        { $match: { totalSold: { $lt: 5 } } },
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
            totalSold: 1
          }
        }
      ]),

      // Products with no reviews
      this.productModel.aggregate([
        { $match: { isActive: true, totalReviews: 0 } },
        {
          $project: {
            name: 1,
            category: 1,
            createdAt: 1
          }
        },
        { $limit: 20 }
      ]),

      // Products with very high stock (potential overstock)
      this.productModel.find({
        stock: { $gt: 100 },
        isActive: true
      }).select('name stock category').lean()
    ]);

    return {
      lowStock: lowStockProducts.map(p => ({
        productId: (p._id as any).toString(),
        name: p.name,
        stock: p.stock,
        category: p.category,
        issue: 'Low Stock'
      })),
      poorPerforming: poorPerformingProducts.map(p => ({
        productId: p.productId,
        name: p.name,
        category: p.category,
        totalSold: p.totalSold,
        issue: 'Poor Sales Performance'
      })),
      noReviews: noReviewProducts.map(p => ({
        productId: (p._id as any).toString(),
        name: p.name,
        category: p.category,
        daysSinceCreated: Math.floor((Date.now() - new Date((p as any).createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        issue: 'No Customer Reviews'
      })),
      overStocked: overStockedProducts.map(p => ({
        productId: (p._id as any).toString(),
        name: p.name,
        stock: p.stock,
        category: p.category,
        issue: 'Potentially Overstocked'
      }))
    };
  }

  /**
   * Generate product recommendations for business improvement
   */
  async getBusinessRecommendations() {
    const [
      topPerformers,
      lowPerformers,
      inventoryIssues,
      pricingOpportunities
    ] = await Promise.all([
      this.getProductPerformanceReport('month'),
      this.getProductPerformanceReport('month'),
      this.getProductsNeedingAttention(),
      this.productModel.find({
        isOnSale: false,
        averageRating: { $gte: 4.0 },
        totalReviews: { $gte: 5 }
      }).select('name price averageRating totalReviews').limit(10)
    ]);

    const recommendations: Array<{
      type: string;
      priority: string;
      title: string;
      description: string;
      action: string;
      affectedProducts: number;
    }> = [];

    // Stock recommendations
    if (inventoryIssues.lowStock.length > 0) {
      recommendations.push({
        type: 'inventory',
        priority: 'high',
        title: 'Restock Low Inventory Items',
        description: `${inventoryIssues.lowStock.length} products are running low on stock`,
        action: 'Review and reorder inventory for these products',
        affectedProducts: inventoryIssues.lowStock.length
      });
    }

    // Performance recommendations
    if (topPerformers.length > 0) {
      recommendations.push({
        type: 'marketing',
        priority: 'medium',
        title: 'Promote Top Performing Products',
        description: 'Consider featuring these high-performing products more prominently',
        action: 'Create marketing campaigns around top performers',
        affectedProducts: Math.min(5, topPerformers.length)
      });
    }

    // Pricing recommendations
    if (pricingOpportunities.length > 0) {
      recommendations.push({
        type: 'pricing',
        priority: 'medium',
        title: 'Consider Price Optimization',
        description: 'Well-reviewed products that could benefit from strategic pricing',
        action: 'Analyze competitor pricing and consider adjustments',
        affectedProducts: pricingOpportunities.length
      });
    }

    return {
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        highPriority: recommendations.filter(r => r.priority === 'high').length,
        potentialRevenue: 'Analysis required for revenue impact calculation'
      }
    };
  }
}
