import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from '../../schemas/review.schema';
import { Product, ProductDocument } from '../../schemas/product.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { CreateReviewDto, GetReviewsDto, ReviewsListResponseDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async createReview(
    productId: string,
    userId: string,
    createReviewDto: CreateReviewDto,
  ): Promise<ReviewDocument> {
    // Check if product exists
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if user already reviewed this product
    const existingReview = await this.reviewModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    });

    if (existingReview) {
      throw new BadRequestException(
        'You have already reviewed this product. Please delete your existing review to add a new one.',
      );
    }

    // Create the review
    const review = new this.reviewModel({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
      rating: createReviewDto.rating,
      comment: createReviewDto.comment,
    });

    const savedReview = await review.save();

    // Update product average rating and review count
    await this.updateProductRating(productId);

    return savedReview;
  }

  async getProductReviews(
    productId: string,
    getReviewsDto: GetReviewsDto,
  ): Promise<ReviewsListResponseDto> {
    const { page = 1, limit = 10, sort = 'newest' } = getReviewsDto;
    const skip = (page - 1) * limit;

    // Check if product exists
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Build sort criteria
    let sortCriteria: any = {};
    switch (sort) {
      case 'newest':
        sortCriteria = { createdAt: -1 };
        break;
      case 'oldest':
        sortCriteria = { createdAt: 1 };
        break;
      case 'highest':
        sortCriteria = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sortCriteria = { rating: 1, createdAt: -1 };
        break;
    }

    // Get reviews with pagination
    const reviews = await this.reviewModel
      .find({ productId: new Types.ObjectId(productId) })
      .populate('userId', 'firstName lastName')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const totalReviews = await this.reviewModel.countDocuments({
      productId: new Types.ObjectId(productId),
    });

    // Get rating breakdown
    const ratingBreakdown = await this.getRatingBreakdown(productId);

    // Transform reviews
    const transformedReviews = reviews.map((review: any) => {
      return {
        _id: review._id.toString(),
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        user: review.userId && review.userId._id
          ? {
              _id: review.userId._id.toString(),
              firstName: review.userId.firstName,
              lastName: review.userId.lastName,
            }
          : {
              _id: 'deleted-user',
              firstName: 'Deleted',
              lastName: 'User',
            },
      };
    });

    return {
      reviews: transformedReviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasNext: page * limit < totalReviews,
        hasPrev: page > 1,
      },
      averageRating: product.averageRating || 0,
      ratingBreakdown,
    };
  }

  async getUserReviews(userId: string, page = 1, limit = 10): Promise<any> {
    const skip = (page - 1) * limit;

    const reviews = await this.reviewModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('productId', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalReviews = await this.reviewModel.countDocuments({
      userId: new Types.ObjectId(userId),
    });

    const transformedReviews = reviews.map((review: any) => ({
      _id: review._id.toString(),
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      product: review.productId
        ? {
            _id: review.productId._id.toString(),
            name: review.productId.name,
            image: review.productId.images?.[0] || null,
          }
        : {
            _id: 'deleted-product',
            name: 'Deleted Product',
            image: null,
          },
    }));

    return {
      reviews: transformedReviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasNext: page * limit < totalReviews,
        hasPrev: page > 1,
      },
    };
  }

  async deleteReview(reviewId: string, userId: string, isAdmin = false): Promise<void> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Check if user owns the review or is admin
    if (!isAdmin && review.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    const productId = review.productId.toString();
    await this.reviewModel.findByIdAndDelete(reviewId);

    // Update product rating after deletion
    await this.updateProductRating(productId);
  }

  private async updateProductRating(productId: string): Promise<void> {
    const result = await this.reviewModel.aggregate([
      { $match: { productId: new Types.ObjectId(productId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const averageRating = result.length > 0 ? Math.round(result[0].averageRating * 10) / 10 : 0;
    const totalReviews = result.length > 0 ? result[0].totalReviews : 0;

    await this.productModel.findByIdAndUpdate(productId, {
      averageRating,
      totalReviews,
    });
  }

  private async getRatingBreakdown(productId: string): Promise<{ 1: number; 2: number; 3: number; 4: number; 5: number }> {
    const breakdown = await this.reviewModel.aggregate([
      { $match: { productId: new Types.ObjectId(productId) } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]);

    const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    breakdown.forEach(item => {
      result[item._id as keyof typeof result] = item.count;
    });

    return result;
  }

  async getReviewById(reviewId: string): Promise<ReviewDocument> {
    const review = await this.reviewModel.findById(reviewId).populate('userId', 'firstName lastName');
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  async canUserReview(productId: string, userId: string): Promise<{ canReview: boolean; hasExistingReview: boolean; existingReviewId?: string }> {
    // Check if product exists
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if user already reviewed this product
    const existingReview = await this.reviewModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    });

    return {
      canReview: !existingReview,
      hasExistingReview: !!existingReview,
      existingReviewId: existingReview?._id?.toString(),
    };
  }

  async debugReviews(productId: string) {
    const reviews = await this.reviewModel
      .find({ productId: new Types.ObjectId(productId) })
      .lean();
    
    const users = await this.userModel.find({}).select('_id firstName lastName').lean();
    
    return {
      reviews: reviews.map(r => ({
        _id: r._id,
        userId: r.userId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt
      })),
      users: users,
      totalReviews: reviews.length,
      totalUsers: users.length
    };
  }
}
