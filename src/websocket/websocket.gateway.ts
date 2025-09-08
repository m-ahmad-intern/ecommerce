import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class WebSocketGatewayHandler implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGatewayHandler.name);
  private connectedClients = new Map<string, Socket>();
  private userSessions = new Map<string, string>(); // userId -> socketId

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
    
    // Remove user session if exists
    for (const [userId, socketId] of this.userSessions.entries()) {
      if (socketId === client.id) {
        this.userSessions.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('join_user_room')
  handleJoinUserRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; token?: string }
  ) {
    try {
      const { userId } = data;
      
      // Store user session
      this.userSessions.set(userId, client.id);
      
      // Join user-specific room for private notifications
      client.join(`user:${userId}`);
      
      this.logger.log(`User ${userId} joined room with socket ${client.id}`);
      
      client.emit('room_joined', {
        success: true,
        room: `user:${userId}`,
        message: 'Successfully joined user room'
      });
    } catch (error) {
      this.logger.error('Error joining user room:', error);
      client.emit('room_joined', {
        success: false,
        message: 'Failed to join user room'
      });
    }
  }

  @SubscribeMessage('join_admin_room')
  handleJoinAdminRoom(@ConnectedSocket() client: Socket) {
    try {
      // For now, allow joining admin room without authentication
      // In production, you might want to validate the user's role here
      client.join('admin');
      
      this.logger.log(`Admin joined room with socket ${client.id}`);
      
      client.emit('admin_room_joined', {
        success: true,
        message: 'Successfully joined admin room'
      });
    } catch (error) {
      this.logger.error('Error joining admin room:', error);
      client.emit('admin_room_joined', {
        success: false,
        message: 'Failed to join admin room'
      });
    }
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string }
  ) {
    const { room } = data;
    client.leave(room);
    
    this.logger.log(`Socket ${client.id} left room: ${room}`);
    
    client.emit('room_left', {
      success: true,
      room,
      message: `Left room: ${room}`
    });
  }

  // Notification Broadcasting Methods

  /**
   * Send notification to a specific user
   */
  sendToUser(userId: string, event: string, data: any) {
    const room = `user:${userId}`;
    this.server.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Sent ${event} to user ${userId}`);
  }

  /**
   * Send notification to all admin users
   */
  sendToAdmins(event: string, data: any) {
    this.server.to('admin').emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Sent ${event} to all admins`);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Broadcasted ${event} to all clients`);
  }

  /**
   * Send sale notification to all users
   */
  broadcastSaleNotification(data: {
    productId: string;
    productName: string;
    originalPrice: number;
    salePrice: number;
    discountPercentage: number;
    message: string;
  }) {
    this.broadcast('sale_notification', {
      type: 'SALE_ALERT',
      ...data,
    });
  }

  /**
   * Send order status update to specific user
   */
  sendOrderUpdate(userId: string, orderData: {
    orderId: string;
    status: string;
    message: string;
  }) {
    this.sendToUser(userId, 'order_update', {
      type: 'ORDER_STATUS',
      ...orderData,
    });
  }

  /**
   * Send new order notification to admins
   */
  sendNewOrderToAdmins(orderData: {
    orderId: string;
    userId: string;
    customerName: string;
    totalAmount: number;
    itemCount: number;
  }) {
    this.sendToAdmins('new_order', {
      type: 'NEW_ORDER',
      ...orderData,
    });
  }

  /**
   * Send inventory alert to admins
   */
  sendInventoryAlert(productData: {
    productId: string;
    productName: string;
    currentStock: number;
    threshold: number;
  }) {
    this.sendToAdmins('inventory_alert', {
      type: 'LOW_STOCK',
      ...productData,
      message: `${productData.productName} is running low on stock (${productData.currentStock} remaining)`,
    });
  }

  /**
   * Get connected client count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get active user sessions count
   */
  getActiveUsersCount(): number {
    return this.userSessions.size;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSessions.has(userId);
  }
}
