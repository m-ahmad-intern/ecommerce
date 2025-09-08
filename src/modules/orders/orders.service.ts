import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { Cart, CartDocument } from '../../schemas/cart.schema';
import { Product, ProductDocument } from '../../schemas/product.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { NotificationService } from '../../notifications/notification.service';
import { CreateOrderDto, UpdateOrderStatusDto, OrderFilterDto, OrderStatus } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationService: NotificationService,
  ) {}

  // Generate unique order number
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }

  // Create order from cart (checkout process)
  async createOrderFromCart(userId: string, createOrderDto: CreateOrderDto) {
    try {
      // Get user's cart with populated products
      const cart = await this.cartModel
        .findOne({ userId: new Types.ObjectId(userId) })
        .populate('items.productId', 'name price salePrice isOnSale images stock isActive');

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty. Cannot create order.');
      }

      // Validate stock and calculate totals
      const orderItems: any[] = [];
      let subtotal = 0;
      const stockUpdates: { productId: any; newStock: number }[] = [];

      for (const cartItem of cart.items) {
        const product = cartItem.productId as any;
        
        if (!product || !product.isActive) {
          throw new BadRequestException(`Product ${product?.name || 'Unknown'} is no longer available`);
        }

        if (product.stock < cartItem.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`
          );
        }

        // Calculate price (use sale price if on sale)
        const itemPrice = product.isOnSale && product.salePrice ? product.salePrice : product.price;
        const itemTotal = itemPrice * cartItem.quantity;
        subtotal += itemTotal;

        // Prepare order item with product snapshot
        orderItems.push({
          productId: product._id,
          productName: product.name,
          productImage: product.images[0] || '',
          price: itemPrice,
          quantity: cartItem.quantity,
          size: cartItem.size,
          color: cartItem.color,
        });

        // Prepare stock update
        stockUpdates.push({
          productId: product._id,
          newStock: product.stock - cartItem.quantity,
        });
      }

      // Calculate tax and total
      const taxRate = 0.1; // 10% tax
      const tax = subtotal * taxRate;
      const total = subtotal + tax;

      // Generate unique order number
      const orderNumber = this.generateOrderNumber();

      // Create order
      const order = new this.orderModel({
        userId: new Types.ObjectId(userId),
        orderNumber,
        items: orderItems,
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        total: Number(total.toFixed(2)),
        status: OrderStatus.PENDING,
        shippingAddress: createOrderDto.shippingAddress || {
          fullName: 'Demo User',
          phoneNumber: '+1-555-0123',
          streetAddress: '123 Main Street',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        },
        orderNotes: createOrderDto.orderNotes || 'Order placed via demo cart',
      });

      // Save order and update stock atomically
      const savedOrder = await order.save();

      // Get user details for notification
      const user = await this.userModel.findById(userId).select('firstName lastName email');
      
      // Send notification to admins about new order
      if (user) {
        await this.notificationService.notifyNewOrder({
          orderId: (savedOrder._id as any).toString(),
          userId: userId,
          customerName: `${user.firstName} ${user.lastName}`,
          totalAmount: Math.round(total),
          itemCount: orderItems.length,
          status: OrderStatus.PENDING,
        });
      }

      // Update product stock
      for (const stockUpdate of stockUpdates) {
        await this.productModel.findByIdAndUpdate(
          stockUpdate.productId,
          { stock: stockUpdate.newStock }
        );
      }

      // Clear user's cart
      await this.cartModel.findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: { items: [] } }
      );

      // Return order with populated details
      return this.getOrderById(userId, savedOrder._id?.toString() || '');

    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create order: ${error.message}`);
    }
  }

  // Get user's order history
  async getUserOrders(userId: string, filterDto: OrderFilterDto) {
    try {
      const page = parseInt(filterDto.page || '1') || 1;
      const limit = parseInt(filterDto.limit || '10') || 10;
      const skip = (page - 1) * limit;

      // Build filter query
      const filter: any = { userId: new Types.ObjectId(userId) };
      if (filterDto.status) {
        filter.status = filterDto.status;
      }

      // Build sort query
      const sortField = filterDto.sortBy || 'createdAt';
      const sortOrder = filterDto.sortOrder === 'asc' ? 1 : -1;
      const sort: any = { [sortField]: sortOrder };

      // Get orders with pagination
      const orders = await this.orderModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('items.productId', 'name images isActive')
        .exec();

      // Get total count for pagination
      const totalOrders = await this.orderModel.countDocuments(filter);
      const totalPages = Math.ceil(totalOrders / limit);

      return {
        orders: orders.map(order => ({
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
          itemCount: order.items.length,
          createdAt: (order as any).createdAt,
          items: order.items.slice(0, 3), // Show first 3 items for preview
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalOrders,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get orders: ${error.message}`);
    }
  }

  // Get specific order details
  async getOrderById(userId: string, orderId: string) {
    try {
      const order = await this.orderModel
        .findOne({ 
          _id: new Types.ObjectId(orderId),
          userId: new Types.ObjectId(userId)
        })
        .populate('items.productId', 'name images isActive')
        .exec();

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        shippingAddress: order.shippingAddress,
        orderNotes: (order as any).orderNotes,
        createdAt: (order as any).createdAt,
        updatedAt: (order as any).updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get order: ${error.message}`);
    }
  }

  // Admin: Get all orders
  async getAllOrders(filterDto: OrderFilterDto) {
    try {
      const page = parseInt(filterDto.page || '1') || 1;
      const limit = parseInt(filterDto.limit || '10') || 10;
      const skip = (page - 1) * limit;

      // Build filter query
      const filter: any = {};
      if (filterDto.status) {
        filter.status = filterDto.status;
      }

      // Build sort query
      const sortField = filterDto.sortBy || 'createdAt';
      const sortOrder = filterDto.sortOrder === 'asc' ? 1 : -1;
      const sort: any = { [sortField]: sortOrder };

      // Get orders with pagination
      const orders = await this.orderModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email')
        .populate('items.productId', 'name images')
        .exec();

      // Get total count for pagination
      const totalOrders = await this.orderModel.countDocuments(filter);
      const totalPages = Math.ceil(totalOrders / limit);

      return {
        orders: orders.map(order => ({
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
          customer: order.userId,
          itemCount: order.items.length,
          createdAt: (order as any).createdAt,
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalOrders,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get orders: ${error.message}`);
    }
  }

  // Admin: Get order details (any order)
  async getAnyOrderById(orderId: string) {
    try {
      const order = await this.orderModel
        .findById(orderId)
        .populate('userId', 'firstName lastName email')
        .populate('items.productId', 'name images isActive')
        .exec();

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get order: ${error.message}`);
    }
  }

  // Admin: Update order status
  async updateOrderStatus(orderId: string, updateOrderStatusDto: UpdateOrderStatusDto) {
    try {
      const order = await this.orderModel.findById(orderId);
      
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Validate status transition
      const validTransitions = this.getValidStatusTransitions(order.status);
      if (!validTransitions.includes(updateOrderStatusDto.status)) {
        throw new BadRequestException(
          `Cannot change status from ${order.status} to ${updateOrderStatusDto.status}`
        );
      }

      // Update order status
      order.status = updateOrderStatusDto.status;
      
      // Add status note if provided
      if (updateOrderStatusDto.statusNote) {
        (order as any).orderNotes = ((order as any).orderNotes || '') + `\n[${new Date().toISOString()}] Status changed to ${updateOrderStatusDto.status}: ${updateOrderStatusDto.statusNote}`;
      }

      await order.save();

      // Send notification to customer about order status update
      await this.notificationService.sendOrderStatusUpdate(
        order.userId.toString(),
        {
          orderId: (order._id as any).toString(),
          status: order.status,
        }
      );

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        updatedAt: (order as any).updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update order status: ${error.message}`);
    }
  }

  // Get valid status transitions
  private getValidStatusTransitions(currentStatus: OrderStatus): OrderStatus[] {
    const transitions = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [], // No transitions from delivered
      [OrderStatus.CANCELLED]: [], // No transitions from cancelled
    };

    return transitions[currentStatus] || [];
  }

  // Admin: Get order statistics
  async getOrderStatistics() {
    try {
      const totalOrders = await this.orderModel.countDocuments();
      const pendingOrders = await this.orderModel.countDocuments({ status: OrderStatus.PENDING });
      const processingOrders = await this.orderModel.countDocuments({ status: OrderStatus.PROCESSING });
      const shippedOrders = await this.orderModel.countDocuments({ status: OrderStatus.SHIPPED });
      const deliveredOrders = await this.orderModel.countDocuments({ status: OrderStatus.DELIVERED });
      const cancelledOrders = await this.orderModel.countDocuments({ status: OrderStatus.CANCELLED });

      // Calculate total revenue from delivered orders
      const revenueResult = await this.orderModel.aggregate([
        { $match: { status: OrderStatus.DELIVERED } },
        { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
      ]);
      const totalRevenue = revenueResult[0]?.totalRevenue || 0;

      // Get recent orders
      const recentOrders = await this.orderModel
        .find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'firstName lastName')
        .select('orderNumber status total createdAt userId');

      return {
        totalOrders,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        recentOrders,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get order statistics: ${error.message}`);
    }
  }
}
