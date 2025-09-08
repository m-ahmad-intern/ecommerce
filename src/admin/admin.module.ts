import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { Product, ProductSchema } from '../schemas/product.schema';
import { Order, OrderSchema } from '../schemas/order.schema';
import { Review, ReviewSchema } from '../schemas/review.schema';
import { Cart, CartSchema } from '../schemas/cart.schema';
import { AdminDashboardController } from './admin-dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UserManagementService } from './user-management.service';
import { OrderManagementService } from './order-management.service';
import { ProductReportsService } from './product-reports.service';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Cart.name, schema: CartSchema },
    ]),
    NotificationModule,
  ],
  controllers: [AdminDashboardController],
  providers: [
    DashboardService,
    UserManagementService,
    OrderManagementService,
    ProductReportsService,
  ],
  exports: [
    DashboardService,
    UserManagementService,
    OrderManagementService,
    ProductReportsService,
  ],
})
export class AdminModule {}
