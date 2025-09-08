import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

export enum ProductCategory {
  CASUAL = 'Casual',
  FORMAL = 'Formal',
  PARTY = 'Party',
  GYM = 'Gym',
}

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ min: 0 })
  salePrice?: number;

  @Prop({ default: false })
  isOnSale: boolean;

  @Prop()
  saleStartDate?: Date;

  @Prop()
  saleEndDate?: Date;

  @Prop({ min: 0, max: 100 })
  discountPercentage?: number;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: String, enum: ProductCategory, required: true })
  category: ProductCategory;

  @Prop({ type: [String], default: [] })
  sizes: string[];

  @Prop({ type: [String], default: [] })
  colors: string[];

  @Prop({ required: true, min: 0, default: 0 })
  stock: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  // Review-related fields
  @Prop({ default: 0, min: 0, max: 5 })
  averageRating: number;

  @Prop({ default: 0, min: 0 })
  totalReviews: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
