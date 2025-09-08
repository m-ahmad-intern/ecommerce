import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, GetReviewsDto } from './dto/review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../schemas/user.schema';
import { Types } from 'mongoose';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('my-reviews')
  @UseGuards(JwtAuthGuard)
  async getMyReviews(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.getUserReviews(
      req.user.userId,
      page || 1,
      limit || 10,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMyReview(@Param('id') reviewId: string, @Request() req: any) {
    // Validate MongoDB ObjectId
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new Error('Invalid review ID format');
    }
    
    await this.reviewsService.deleteReview(reviewId, req.user.userId, false);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async adminDeleteReview(@Param('id') reviewId: string, @Request() req: any) {
    // Validate MongoDB ObjectId
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new Error('Invalid review ID format');
    }
    
    await this.reviewsService.deleteReview(reviewId, req.user.userId, true);
  }

  @Get(':id')
  async getReview(@Param('id') reviewId: string) {
    // Validate MongoDB ObjectId
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new Error('Invalid review ID format');
    }
    
    return this.reviewsService.getReviewById(reviewId);
  }
}

@Controller('products')
export class ProductReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  async createReview(
    @Param('id') productId: string,
    @Body(ValidationPipe) createReviewDto: CreateReviewDto,
    @Request() req: any,
  ) {
    // Validate MongoDB ObjectId
    if (!Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID format');
    }
    
    const review = await this.reviewsService.createReview(
      productId,
      req.user.userId,
      createReviewDto,
    );

    return {
      message: 'Review created successfully',
      review,
    };
  }

  @Get(':id/reviews')
  async getProductReviews(
    @Param('id') productId: string,
    @Query(ValidationPipe) getReviewsDto: GetReviewsDto,
  ) {
    // Validate MongoDB ObjectId
    if (!Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID format');
    }
    
    return this.reviewsService.getProductReviews(productId, getReviewsDto);
  }

  @Get('debug/:productId')
  async debugReviews(@Param('productId') productId: string) {
    // Get raw reviews without populate
    const rawReviews = await this.reviewsService.debugReviews(productId);
    return rawReviews;
  }

  @Get(':id/reviews/can-review')
  @UseGuards(JwtAuthGuard)
  async canUserReview(
    @Param('id') productId: string,
    @Request() req: any,
  ) {
    // Validate MongoDB ObjectId
    if (!Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID format');
    }
    
    return this.reviewsService.canUserReview(productId, req.user.userId);
  }
}
