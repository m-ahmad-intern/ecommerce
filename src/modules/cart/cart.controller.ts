import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto, RemoveFromCartDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../schemas/user.schema';
import { UserRole } from '../../schemas/user.schema';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@CurrentUser() user: UserDocument) {
    return this.cartService.getCart((user as any)._id.toString());
  }

  @Get('count')
  async getCartItemCount(@CurrentUser() user: UserDocument) {
    const count = await this.cartService.getCartItemCount((user as any)._id.toString());
    return { count };
  }

  @Post('add')
  async addToCart(
    @Body() addToCartDto: AddToCartDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.cartService.addToCart((user as any)._id.toString(), addToCartDto);
  }

  @Put('item/:itemId')
  async updateCartItem(
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.cartService.updateCartItem((user as any)._id.toString(), itemId, updateCartItemDto);
  }

  @Delete('remove')
  async removeFromCart(
    @Body() removeFromCartDto: RemoveFromCartDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.cartService.removeFromCart((user as any)._id.toString(), removeFromCartDto);
  }

  @Delete('item/:itemId')
  async removeCartItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.cartService.removeCartItem((user as any)._id.toString(), itemId);
  }

  @Delete('clear')
  async clearCart(@CurrentUser() user: UserDocument) {
    return this.cartService.clearCart((user as any)._id.toString());
  }

  // Admin only endpoints
  @Get('admin/analytics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getCartAnalytics() {
    return this.cartService.getCartAnalytics();
  }
}
