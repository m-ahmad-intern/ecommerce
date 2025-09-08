import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGatewayHandler } from '../websocket/websocket.gateway';

export interface OrderNotification {
  orderId: string;
  userId: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
  status: string;
}

export interface SaleNotification {
  productId: string;
  productName: string;
  originalPrice: number;
  salePrice: number;
  discountPercentage: number;
  category?: string;
}

export interface InventoryNotification {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
}

export interface SystemNotification {
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  title: string;
  message: string;
  data?: any;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private webSocketGateway: WebSocketGatewayHandler) {}

  /**
   * Send order status update to customer
   */
  async sendOrderStatusUpdate(
    userId: string,
    orderData: {
      orderId: string;
      status: string;
      trackingNumber?: string;
      estimatedDelivery?: Date;
    }
  ) {
    const statusMessages = {
      pending: 'Your order has been received and is being processed.',
      confirmed: 'Your order has been confirmed and is being prepared.',
      shipped: 'Your order has been shipped and is on its way!',
      delivered: 'Your order has been delivered successfully.',
      cancelled: 'Your order has been cancelled.',
    };

    const notification = {
      type: 'ORDER_UPDATE',
      title: 'Order Status Update',
      message: statusMessages[orderData.status] || `Your order status: ${orderData.status}`,
      orderId: orderData.orderId,
      status: orderData.status,
      trackingNumber: orderData.trackingNumber,
      estimatedDelivery: orderData.estimatedDelivery?.toISOString(),
    };

    this.webSocketGateway.sendToUser(userId, 'order_status_update', notification);
    this.logger.log(`Order status update sent to user ${userId} for order ${orderData.orderId}`);
  }

  /**
   * Notify admins about new orders
   */
  async notifyNewOrder(orderData: OrderNotification) {
    const notification = {
      type: 'NEW_ORDER',
      title: 'New Order Received',
      message: `New order from ${orderData.customerName} - $${orderData.totalAmount}`,
      ...orderData,
    };

    this.webSocketGateway.sendToAdmins('new_order_notification', notification);
    this.logger.log(`New order notification sent to admins for order ${orderData.orderId}`);
  }

  /**
   * Send flash sale notification to all users
   */
  async broadcastFlashSale(saleData: SaleNotification & { duration?: number }) {
    const notification = {
      type: 'FLASH_SALE',
      title: '🔥 Flash Sale Alert!',
      message: `${saleData.productName} is now ${saleData.discountPercentage}% off!`,
      ...saleData,
      duration: saleData.duration || 3600000, // 1 hour default
    };

    this.webSocketGateway.broadcast('flash_sale_notification', notification);
    this.logger.log(`Flash sale notification broadcasted for product ${saleData.productId}`);
  }

  /**
   * Send category sale notification
   */
  async broadcastCategorySale(category: string, discountPercentage: number, productCount: number) {
    const notification = {
      type: 'CATEGORY_SALE',
      title: `${category} Sale!`,
      message: `${discountPercentage}% off on all ${category} items! ${productCount} products on sale.`,
      category,
      discountPercentage,
      productCount,
    };

    this.webSocketGateway.broadcast('category_sale_notification', notification);
    this.logger.log(`Category sale notification broadcasted for ${category}`);
  }

  /**
   * Send low stock alert to admins
   */
  async notifyLowStock(inventoryData: InventoryNotification) {
    const notification = {
      type: 'LOW_STOCK',
      title: 'Low Stock Alert',
      message: `${inventoryData.productName} is running low (${inventoryData.currentStock} left)`,
      ...inventoryData,
      severity: inventoryData.currentStock === 0 ? 'CRITICAL' : 'WARNING',
    };

    this.webSocketGateway.sendToAdmins('low_stock_notification', notification);
    this.logger.log(`Low stock notification sent for product ${inventoryData.productId}`);
  }

  /**
   * Send system notification to specific user
   */
  async sendSystemNotificationToUser(userId: string, notification: SystemNotification) {
    const payload = {
      notificationType: 'SYSTEM_NOTIFICATION',
      ...notification,
    };

    this.webSocketGateway.sendToUser(userId, 'system_notification', payload);
    this.logger.log(`System notification sent to user ${userId}: ${notification.title}`);
  }

  /**
   * Send system notification to all admins
   */
  async sendSystemNotificationToAdmins(notification: SystemNotification) {
    const payload = {
      notificationType: 'SYSTEM_NOTIFICATION',
      ...notification,
    };

    this.webSocketGateway.sendToAdmins('system_notification', payload);
    this.logger.log(`System notification sent to admins: ${notification.title}`);
  }

  /**
   * Broadcast system notification to all users
   */
  async broadcastSystemNotification(notification: SystemNotification) {
    const payload = {
      notificationType: 'SYSTEM_NOTIFICATION',
      ...notification,
    };

    this.webSocketGateway.broadcast('system_notification', payload);
    this.logger.log(`System notification broadcasted: ${notification.title}`);
  }

  /**
   * Send payment confirmation notification
   */
  async sendPaymentConfirmation(
    userId: string,
    paymentData: {
      orderId: string;
      amount: number;
      paymentMethod: string;
      transactionId: string;
    }
  ) {
    const notification = {
      type: 'PAYMENT_CONFIRMATION',
      title: 'Payment Confirmed',
      message: `Your payment of $${paymentData.amount} has been confirmed`,
      ...paymentData,
    };

    this.webSocketGateway.sendToUser(userId, 'payment_confirmation', notification);
    this.logger.log(`Payment confirmation sent to user ${userId} for order ${paymentData.orderId}`);
  }

  /**
   * Send welcome notification to new users
   */
  async sendWelcomeNotification(userId: string, userName: string) {
    const notification = {
      type: 'WELCOME',
      title: `Welcome ${userName}!`,
      message: 'Thank you for joining our store. Start shopping now and enjoy exclusive deals!',
      data: {
        discountCode: 'WELCOME10',
        discountPercentage: 10,
      },
    };

    this.webSocketGateway.sendToUser(userId, 'welcome_notification', notification);
    this.logger.log(`Welcome notification sent to user ${userId}`);
  }

  /**
   * Send cart abandonment reminder (after user leaves items in cart)
   */
  async sendCartReminderNotification(
    userId: string,
    cartData: {
      itemCount: number;
      totalValue: number;
      abandonedAt: Date;
    }
  ) {
    const notification = {
      type: 'CART_REMINDER',
      title: 'Items waiting in your cart!',
      message: `You have ${cartData.itemCount} items ($${cartData.totalValue}) waiting in your cart`,
      ...cartData,
      reminderDelay: Date.now() - cartData.abandonedAt.getTime(),
    };

    this.webSocketGateway.sendToUser(userId, 'cart_reminder', notification);
    this.logger.log(`Cart reminder sent to user ${userId}`);
  }

  /**
   * Send price drop notification to users who favorited a product
   */
  async sendPriceDropNotification(
    userIds: string[],
    priceData: {
      productId: string;
      productName: string;
      oldPrice: number;
      newPrice: number;
      discountPercentage: number;
    }
  ) {
    const notification = {
      type: 'PRICE_DROP',
      title: 'Price Drop Alert!',
      message: `${priceData.productName} price dropped by ${priceData.discountPercentage}%`,
      ...priceData,
    };

    userIds.forEach(userId => {
      this.webSocketGateway.sendToUser(userId, 'price_drop_notification', notification);
    });

    this.logger.log(`Price drop notification sent to ${userIds.length} users for product ${priceData.productId}`);
  }

  /**
   * Get notification statistics for admin dashboard
   */
  async getNotificationStats() {
    const connectedClients = this.webSocketGateway.getConnectedClientsCount();
    const activeUsers = this.webSocketGateway.getActiveUsersCount();

    return {
      connectedClients,
      activeUsers,
      uptime: process.uptime(),
      lastUpdate: new Date().toISOString(),
    };
  }
}
