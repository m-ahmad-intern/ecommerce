import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../schemas/product.schema';
import { WebSocketGatewayHandler } from '../websocket/websocket.gateway';

export interface ApplySaleDto {
  productIds: string[];
  discountPercentage?: number;
  salePrice?: number;
  startDate?: Date;
  endDate?: Date;
  notifyUsers?: boolean;
}

export interface BulkSaleDto {
  category?: string;
  discountPercentage: number;
  startDate?: Date;
  endDate?: Date;
  notifyUsers?: boolean;
}

@Injectable()
export class SaleService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private webSocketGateway: WebSocketGatewayHandler,
  ) {}

  /**
   * Apply sale to specific products
   */
  async applySaleToProducts(applySaleDto: ApplySaleDto) {
    const { productIds, discountPercentage, salePrice, startDate, endDate, notifyUsers = true } = applySaleDto;

    if (!productIds || productIds.length === 0) {
      throw new BadRequestException('Product IDs are required');
    }

    if (!discountPercentage && !salePrice) {
      throw new BadRequestException('Either discount percentage or sale price is required');
    }

    if (discountPercentage && (discountPercentage <= 0 || discountPercentage > 100)) {
      throw new BadRequestException('Discount percentage must be between 1 and 100');
    }

    const products = await this.productModel.find({ _id: { $in: productIds } });

    if (products.length !== productIds.length) {
      throw new NotFoundException('Some products not found');
    }

    const updatedProducts: ProductDocument[] = [];

    for (const product of products) {
      const updateData: any = {
        isOnSale: true,
        saleStartDate: startDate || new Date(),
        saleEndDate: endDate,
        isFeatured: true, // Feature products on sale
      };

      if (discountPercentage) {
        updateData.discountPercentage = discountPercentage;
        updateData.salePrice = product.price * (1 - discountPercentage / 100);
      } else if (salePrice) {
        updateData.salePrice = salePrice;
        updateData.discountPercentage = Math.round(((product.price - salePrice) / product.price) * 100);
      }

      const updatedProduct = await this.productModel.findByIdAndUpdate(
        product._id,
        updateData,
        { new: true }
      );

      if (updatedProduct) {
        updatedProducts.push(updatedProduct);

        // Send real-time notification
        if (notifyUsers) {
          this.webSocketGateway.broadcastSaleNotification({
            productId: (product._id as any).toString(),
            productName: product.name,
            originalPrice: product.price,
            salePrice: updateData.salePrice,
            discountPercentage: updateData.discountPercentage,
            message: `${product.name} is now on sale with ${updateData.discountPercentage}% off!`,
          });
        }
      }
    }

    return {
      success: true,
      message: `Sale applied to ${updatedProducts.length} products`,
      products: updatedProducts,
    };
  }

  /**
   * Apply bulk sale to products by category
   */
  async applyBulkSale(bulkSaleDto: BulkSaleDto) {
    const { category, discountPercentage, startDate, endDate, notifyUsers = true } = bulkSaleDto;

    if (discountPercentage <= 0 || discountPercentage > 100) {
      throw new BadRequestException('Discount percentage must be between 1 and 100');
    }

    const filter: any = { isActive: true };
    if (category) {
      filter.category = category;
    }

    const products = await this.productModel.find(filter);

    if (products.length === 0) {
      throw new NotFoundException('No products found for the specified criteria');
    }

    const updateData = {
      isOnSale: true,
      discountPercentage,
      saleStartDate: startDate || new Date(),
      saleEndDate: endDate,
      isFeatured: true,
    };

    // Update all products in bulk
    await this.productModel.updateMany(filter, updateData);

    // Calculate sale prices for each product
    const updatedProducts: ProductDocument[] = [];
    for (const product of products) {
      const salePrice = product.price * (1 - discountPercentage / 100);
      
      const updatedProduct = await this.productModel.findByIdAndUpdate(
        product._id,
        { salePrice },
        { new: true }
      );

      if (updatedProduct) {
        updatedProducts.push(updatedProduct);
      }
    }

    // Send bulk sale notification
    if (notifyUsers) {
      this.webSocketGateway.broadcast('bulk_sale_notification', {
        type: 'BULK_SALE',
        category: category || 'All Categories',
        discountPercentage,
        productCount: updatedProducts.length,
        message: `🔥 Flash Sale Alert! ${discountPercentage}% off on ${category || 'all products'}!`,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: true,
      message: `Bulk sale applied to ${updatedProducts.length} products`,
      affectedProducts: updatedProducts.length,
      category: category || 'All Categories',
      discountPercentage,
    };
  }

  /**
   * Remove sale from specific products
   */
  async removeSaleFromProducts(productIds: string[]) {
    if (!productIds || productIds.length === 0) {
      throw new BadRequestException('Product IDs are required');
    }

    const result = await this.productModel.updateMany(
      { _id: { $in: productIds } },
      {
        $unset: {
          salePrice: 1,
          saleStartDate: 1,
          saleEndDate: 1,
          discountPercentage: 1,
        },
        isOnSale: false,
        isFeatured: false,
      }
    );

    return {
      success: true,
      message: `Sale removed from ${result.modifiedCount} products`,
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * Get all products currently on sale
   */
  async getProductsOnSale(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const products = await this.productModel
      .find({ isOnSale: true, isActive: true })
      .sort({ saleStartDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'firstName lastName email');

    const total = await this.productModel.countDocuments({ isOnSale: true, isActive: true });

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get sale statistics
   */
  async getSaleStatistics() {
    const [
      totalProducts,
      productsOnSale,
      featuredProducts,
      expiredSales
    ] = await Promise.all([
      this.productModel.countDocuments({ isActive: true }),
      this.productModel.countDocuments({ isOnSale: true, isActive: true }),
      this.productModel.countDocuments({ isFeatured: true, isActive: true }),
      this.productModel.countDocuments({
        isOnSale: true,
        saleEndDate: { $lt: new Date() },
        isActive: true
      })
    ]);

    // Calculate average discount
    const salesData = await this.productModel.aggregate([
      { $match: { isOnSale: true, isActive: true } },
      {
        $group: {
          _id: null,
          avgDiscount: { $avg: '$discountPercentage' },
          maxDiscount: { $max: '$discountPercentage' },
          minDiscount: { $min: '$discountPercentage' },
        },
      },
    ]);

    const averageDiscount = salesData.length > 0 ? salesData[0].avgDiscount : 0;
    const maxDiscount = salesData.length > 0 ? salesData[0].maxDiscount : 0;
    const minDiscount = salesData.length > 0 ? salesData[0].minDiscount : 0;

    return {
      totalProducts,
      productsOnSale,
      featuredProducts,
      expiredSales,
      salePercentage: totalProducts > 0 ? Math.round((productsOnSale / totalProducts) * 100) : 0,
      discountStatistics: {
        average: Math.round(averageDiscount || 0),
        maximum: maxDiscount || 0,
        minimum: minDiscount || 0,
      },
    };
  }

  /**
   * Clean up expired sales automatically
   */
  async cleanupExpiredSales() {
    const result = await this.productModel.updateMany(
      {
        isOnSale: true,
        saleEndDate: { $lt: new Date() },
      },
      {
        $unset: {
          salePrice: 1,
          saleStartDate: 1,
          saleEndDate: 1,
          discountPercentage: 1,
        },
        isOnSale: false,
        isFeatured: false,
      }
    );

    return {
      success: true,
      message: `Cleaned up ${result.modifiedCount} expired sales`,
      cleanedCount: result.modifiedCount,
    };
  }

  /**
   * Schedule future sale
   */
  async scheduleSale(applySaleDto: ApplySaleDto) {
    const { startDate } = applySaleDto;

    if (!startDate || startDate <= new Date()) {
      throw new BadRequestException('Start date must be in the future for scheduled sales');
    }

    // For now, we'll store the scheduled sale and rely on a cron job to activate it
    // In a production app, you'd use a job queue like Bull
    return this.applySaleToProducts({ ...applySaleDto, notifyUsers: false });
  }
}
