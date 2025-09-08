import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from '../../schemas/cart.schema';
import { Product, ProductDocument } from '../../schemas/product.schema';
import { AddToCartDto, UpdateCartItemDto, RemoveFromCartDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async getCart(userId: string) {
    const cart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('items.productId', 'name price salePrice isOnSale images stock isActive');

    if (!cart) {
      return { items: [], itemCount: 0, subtotal: 0, tax: 0, total: 0 };
    }

    let subtotal = 0;
    const items = cart.items.map((item: any) => {
      const product = item.productId;
      const price = product?.isOnSale ? product.salePrice : product?.price || 0;
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;
      
      return {
        _id: item._id,
        product,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        itemTotal,
        addedAt: item.addedAt,
      };
    });

    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    return {
      _id: cart._id,
      items,
      itemCount: items.reduce((count: number, item: any) => count + item.quantity, 0),
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  }

  async getCartItemCount(userId: string): Promise<number> {
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!cart) return 0;
    return cart.items.reduce((count, item) => count + item.quantity, 0);
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    const { productId, quantity, size, color } = addToCartDto;

    const product = await this.productModel.findById(productId);
    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    if (product.stock < quantity) {
      throw new BadRequestException(`Only ${product.stock} items available`);
    }

    let cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });
    
    if (!cart) {
      cart = new this.cartModel({
        userId: new Types.ObjectId(userId),
        items: [],
      });
    }

    const existingItem = cart.items.find((item: any) => 
      item.productId.toString() === productId &&
      item.size === size &&
      item.color === color
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        productId: new Types.ObjectId(productId),
        quantity,
        size,
        color,
        addedAt: new Date(),
      } as any);
    }

    await cart.save();
    return this.getCart(userId);
  }

  async updateCartItem(userId: string, itemId: string, updateCartItemDto: UpdateCartItemDto) {
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = cart.items.find((item: any) => item._id.toString() === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (updateCartItemDto.quantity) {
      item.quantity = updateCartItemDto.quantity;
    }
    if (updateCartItemDto.size !== undefined) {
      item.size = updateCartItemDto.size;
    }
    if (updateCartItemDto.color !== undefined) {
      item.color = updateCartItemDto.color;
    }

    await cart.save();
    return this.getCart(userId);
  }

  async removeFromCart(userId: string, removeFromCartDto: RemoveFromCartDto) {
    const { productId, size, color } = removeFromCartDto;
    
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = cart.items.filter((item: any) => !(
      item.productId.toString() === productId &&
      item.size === size &&
      item.color === color
    ));

    await cart.save();
    return this.getCart(userId);
  }

  async removeCartItem(userId: string, itemId: string) {
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = cart.items.filter((item: any) => item._id.toString() !== itemId);
    await cart.save();
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    await this.cartModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: { items: [] } },
      { upsert: true }
    );

    return { message: 'Cart cleared successfully' };
  }

  async getCartAnalytics() {
    const totalCarts = await this.cartModel.countDocuments();
    const activeCarts = await this.cartModel.countDocuments({ 
      items: { $exists: true, $not: { $size: 0 } } 
    });

    return {
      totalCarts,
      activeCarts,
      averageCartValue: 0,
      totalCartValue: 0,
      topProducts: [],
    };
  }
}
