import { IsNotEmpty, IsNumber, IsString, Min, Max, Length, IsOptional, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateReviewDto {
  @IsNotEmpty({ message: 'Rating is required' })
  @IsNumber({}, { message: 'Rating must be a number' })
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating must be at most 5' })
  @Type(() => Number)
  rating: number;

  @IsNotEmpty({ message: 'Comment is required' })
  @IsString({ message: 'Comment must be a string' })
  @Length(10, 500, { message: 'Comment must be between 10 and 500 characters' })
  @Transform(({ value }) => value?.trim())
  comment: string;
}

export class GetReviewsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit must be at most 50' })
  limit?: number = 10;

  @IsOptional()
  @IsEnum(['newest', 'oldest', 'highest', 'lowest'], { 
    message: 'Sort must be one of: newest, oldest, highest, lowest' 
  })
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest' = 'newest';
}

export class ReviewResponseDto {
  _id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

export class ReviewsListResponseDto {
  reviews: ReviewResponseDto[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalReviews: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  averageRating: number;
  ratingBreakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
