import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Review, ReviewDocument } from '../schemas/review.schema';

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isVerified?: boolean;
  sortBy?: 'createdAt' | 'firstName' | 'email' | 'lastLogin';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  isVerified?: boolean;
  isActive?: boolean;
}

export interface UserDetailsResponse {
  user: UserDocument;
  statistics: {
    totalOrders: number;
    totalSpent: number;
    totalReviews: number;
    averageRating: number;
    accountAge: number;
    lastOrderDate?: Date;
  };
  recentOrders: OrderDocument[];
  recentReviews: ReviewDocument[];
}

@Injectable()
export class UserManagementService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
  ) {}

  /**
   * Get paginated list of users with filtering and searching
   */
  async getUsers(query: UserListQuery) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const skip = (page - 1) * limit;

    // Build filter criteria
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      filter.role = role;
    }

    if (typeof isVerified === 'boolean') {
      filter.isEmailVerified = isVerified;
    }

    // Build sort criteria
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password -otp -otpExpiry')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(filter)
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get detailed user information with statistics
   */
  async getUserDetails(userId: string): Promise<UserDetailsResponse> {
    const user = await this.userModel
      .findById(userId)
      .select('-password -otp -otpExpiry');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user statistics
    const [
      orderStats,
      reviewStats,
      recentOrders,
      recentReviews
    ] = await Promise.all([
      this.orderModel.aggregate([
        { $match: { userId: user._id, status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
            lastOrderDate: { $max: '$createdAt' }
          }
        }
      ]),
      this.reviewModel.aggregate([
        { $match: { userId: user._id } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' }
          }
        }
      ]),
      this.orderModel
        .find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('items.productId', 'name images')
        .lean(),
      this.reviewModel
        .find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('productId', 'name images')
        .lean()
    ]);

    const orderStatistics = orderStats[0] || { totalOrders: 0, totalSpent: 0 };
    const reviewStatistics = reviewStats[0] || { totalReviews: 0, averageRating: 0 };

    const accountAge = Math.floor((Date.now() - new Date((user as any).createdAt).getTime()) / (1000 * 60 * 60 * 24));

    return {
      user,
      statistics: {
        totalOrders: orderStatistics.totalOrders,
        totalSpent: orderStatistics.totalSpent,
        totalReviews: reviewStatistics.totalReviews,
        averageRating: Math.round(reviewStatistics.averageRating * 100) / 100,
        accountAge,
        lastOrderDate: orderStatistics.lastOrderDate,
      },
      recentOrders,
      recentReviews,
    };
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, updateData: UpdateUserDto) {
    // Check if email is being changed and if it's already in use
    if (updateData.email) {
      const existingUser = await this.userModel.findOne({
        email: updateData.email,
        _id: { $ne: userId }
      });

      if (existingUser) {
        throw new ConflictException('Email is already in use by another user');
      }
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpiry');

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  /**
   * Suspend or activate user account
   */
  async toggleUserStatus(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot suspend super admin accounts');
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { isActive: !(user as any).isActive } },
      { new: true }
    ).select('-password -otp -otpExpiry');

    if (!updatedUser) {
      throw new NotFoundException('User not found after update');
    }

    return {
      user: updatedUser,
      action: (updatedUser as any).isActive ? 'activated' : 'suspended',
      message: `User account has been ${(updatedUser as any).isActive ? 'activated' : 'suspended'}`
    };
  }

  /**
   * Change user role (admin only)
   */
  async changeUserRole(userId: string, newRole: UserRole) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot change super admin role');
    }

    // Check if trying to create another super admin
    if (newRole === UserRole.SUPER_ADMIN) {
      const existingSuperAdmin = await this.userModel.findOne({ 
        role: UserRole.SUPER_ADMIN,
        _id: { $ne: userId } // Exclude current user from check
      });

      if (existingSuperAdmin) {
        throw new BadRequestException('Only one super admin is allowed in the system');
      }
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { role: newRole } },
      { new: true }
    ).select('-password -otp -otpExpiry');

    return {
      user: updatedUser,
      previousRole: user.role,
      newRole,
      message: `User role changed from ${user.role} to ${newRole}`
    };
  }

  /**
   * Delete user account (soft delete by deactivating)
   */
  async deleteUser(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot delete super admin accounts');
    }

    // Check if user has active orders
    const activeOrders = await this.orderModel.countDocuments({
      userId: user._id,
      status: { $in: ['pending', 'confirmed', 'shipped'] }
    });

    if (activeOrders > 0) {
      throw new BadRequestException('Cannot delete user with active orders. Please complete or cancel orders first.');
    }

    // Soft delete by deactivating account
    await this.userModel.findByIdAndUpdate(userId, {
      $set: {
        isActive: false,
        email: `deleted_${Date.now()}_${user.email}`, // Prevent email conflicts
        deletedAt: new Date()
      }
    });

    return {
      success: true,
      message: 'User account has been deleted',
      userId
    };
  }

  /**
   * Get user activity summary
   */
  async getUserActivity(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [orders, reviews] = await Promise.all([
      this.orderModel.find({
        userId,
        createdAt: { $gte: startDate }
      }).sort({ createdAt: -1 }),
      this.reviewModel.find({
        userId,
        createdAt: { $gte: startDate }
      }).sort({ createdAt: -1 }).populate('productId', 'name')
    ]);

    return {
      period: `Last ${days} days`,
      orders: orders.length,
      reviews: reviews.length,
      recentActivity: [
        ...orders.map(order => ({
          type: 'order',
          date: (order as any).createdAt,
          description: `Order #${order.orderNumber} - $${(order as any).total}`,
          status: order.status
        })),
        ...reviews.map(review => ({
          type: 'review',
          date: review.createdAt,
          description: `Reviewed ${(review.productId as any)?.name || 'Product'} - ${review.rating} stars`,
          status: 'completed'
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }

  /**
   * Get user analytics for admin dashboard
   */
  async getUserAnalytics() {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      usersByRole,
      verificationStats
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isActive: true }),
      this.userModel.countDocuments({ createdAt: { $gte: thisMonth } }),
      this.userModel.countDocuments({ 
        createdAt: { $gte: lastMonth, $lt: thisMonth } 
      }),
      this.userModel.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      this.userModel.aggregate([
        {
          $group: {
            _id: '$isEmailVerified',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const userGrowth = newUsersLastMonth > 0 
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100 
      : 100;

    return {
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      userGrowth: Math.round(userGrowth * 100) / 100,
      usersByRole: usersByRole.reduce((acc, role) => {
        acc[role._id] = role.count;
        return acc;
      }, {}),
      verificationStats: verificationStats.reduce((acc, stat) => {
        acc[stat._id ? 'verified' : 'unverified'] = stat.count;
        return acc;
      }, {})
    };
  }

  /**
   * Bulk operations on users
   */
  async bulkUpdateUsers(userIds: string[], operation: 'activate' | 'suspend' | 'verify') {
    const filter = { 
      _id: { $in: userIds },
      role: { $ne: UserRole.SUPER_ADMIN } // Protect super admins
    };

    let updateData: any = {};

    switch (operation) {
      case 'activate':
        updateData = { isActive: true };
        break;
      case 'suspend':
        updateData = { isActive: false };
        break;
      case 'verify':
        updateData = { isEmailVerified: true };
        break;
    }

    const result = await this.userModel.updateMany(filter, { $set: updateData });

    return {
      success: true,
      operation,
      affectedUsers: result.modifiedCount,
      message: `${operation} operation completed for ${result.modifiedCount} users`
    };
  }
}
