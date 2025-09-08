import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFilterDto,
} from './dto/product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../schemas/user.schema';
import { UserRole } from '../../schemas/user.schema';
import { ProductCategory } from '../../schemas/product.schema';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Public endpoints (no authentication required)
  @Get()
  async getProducts(@Query(ValidationPipe) filterDto: ProductFilterDto) {
    return this.productsService.getProducts(filterDto);
  }

  @Get('categories')
  async getCategories() {
    return this.productsService.getCategories();
  }

  @Get('category/:category')
  async getProductsByCategory(
    @Param('category') category: ProductCategory,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 12,
  ) {
    return this.productsService.getProductsByCategory(category, page, limit);
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  // Admin and Super Admin only endpoints
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  async createProduct(
    @Body(ValidationPipe) createProductDto: CreateProductDto,
    @UploadedFiles() images: Express.Multer.File[],
    @CurrentUser() user: UserDocument,
  ) {
    return this.productsService.createProduct(
      createProductDto,
      images,
      (user as any)._id.toString(),
    );
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FilesInterceptor('images', 10))
  async updateProduct(
    @Param('id') id: string,
    @Body(ValidationPipe) updateProductDto: UpdateProductDto,
    @UploadedFiles() images: Express.Multer.File[],
    @CurrentUser() user: UserDocument,
  ) {
    return this.productsService.updateProduct(
      id,
      updateProductDto,
      images,
      (user as any)._id.toString(),
      user.role,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteProduct(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.productsService.deleteProduct(
      id,
      (user as any)._id.toString(),
      user.role,
    );
  }

  @Delete(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteProductImage(
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.productsService.deleteProductImage(
      id,
      imageUrl,
      (user as any)._id.toString(),
      user.role,
    );
  }

  // Admin dashboard endpoints
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getProductStats() {
    return this.productsService.getProductStats();
  }

  @Get('admin/low-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getLowStockProducts(@Query('threshold') threshold: number = 10) {
    return this.productsService.getLowStockProducts(threshold);
  }
}
