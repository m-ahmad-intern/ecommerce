import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Product,
  ProductDocument,
  ProductCategory,
} from '../../schemas/product.schema';
import { User, UserDocument, UserRole } from '../../schemas/user.schema';
import { CloudinaryService } from './cloudinary.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFilterDto,
} from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async createProduct(
    createProductDto: CreateProductDto,
    images: Express.Multer.File[],
    userId: string,
  ): Promise<any> {
    try {
      console.log('Creating product with data:', createProductDto);
      console.log('Images received:', images?.length || 0);
      
      if (images && images.length > 0) {
        images.forEach((img, index) => {
          console.log(`Image ${index + 1}:`, {
            fieldname: img.fieldname,
            originalname: img.originalname,
            mimetype: img.mimetype,
            size: img.size,
            bufferLength: img.buffer?.length || 'No buffer'
          });
        });
      }

      // Upload images to Cloudinary
      let imageUrls: string[] = [];
      if (images && images.length > 0) {
        console.log('Uploading images to Cloudinary...');
        imageUrls = await this.cloudinaryService.uploadMultipleImages(images);
        console.log('Images uploaded successfully:', imageUrls);
      }

      // Check if salePrice is provided and set isOnSale
      const isOnSale = createProductDto.salePrice
        ? createProductDto.salePrice < createProductDto.price
        : false;

      // Create product
      const product = new this.productModel({
        ...createProductDto,
        images: imageUrls,
        isOnSale,
        createdBy: userId,
      });

      const savedProduct = await product.save();
      await savedProduct.populate('createdBy', 'firstName lastName email');

      return {
        message: 'Product created successfully',
        product: savedProduct,
      };
    } catch (error) {
      console.error('Product creation error:', error);
      throw new BadRequestException(
        `Failed to create product: ${error.message}`,
      );
    }
  }

  async getProducts(filterDto: ProductFilterDto): Promise<any> {
    const {
      category,
      minPrice,
      maxPrice,
      size,
      color,
      search,
      onSale,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    // Build filter query
    const filter: any = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    if (size) {
      filter.sizes = { $in: [size] };
    }

    if (color) {
      filter.colors = { $in: [color] };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (onSale !== undefined) {
      filter.isOnSale = onSale;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    try {
      const [products, totalCount] = await Promise.all([
        this.productModel
          .find(filter)
          .populate('createdBy', 'firstName lastName')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.productModel.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        products,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch products: ${error.message}`,
      );
    }
  }

  async getProductById(id: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID');
    }

    const product = await this.productModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async getProductsByCategory(
    category: ProductCategory,
    page: number = 1,
    limit: number = 12,
  ): Promise<any> {
    const filterDto: ProductFilterDto = { category, page, limit };
    return this.getProducts(filterDto);
  }

  async updateProduct(
    id: string,
    updateProductDto: UpdateProductDto,
    newImages: Express.Multer.File[],
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
    const product = await this.getProductById(id);

    // Check permissions
    if (
      userRole === UserRole.USER ||
      (userRole === UserRole.ADMIN &&
        product.createdBy._id.toString() !== userId)
    ) {
      throw new ForbiddenException(
        'You do not have permission to update this product',
      );
    }

    let newImageUrls: string[] = [];

    try {
      // Handle new image uploads
      if (newImages && newImages.length > 0) {
        newImageUrls =
          await this.cloudinaryService.uploadMultipleImages(newImages);
        // Add new images to existing ones
        const updatedImages = [...(product.images || []), ...newImageUrls];
        updateProductDto.images = updatedImages;
      }

      // Check if salePrice is updated and set isOnSale
      if (updateProductDto.salePrice !== undefined) {
        const price = updateProductDto.price || product.price;
        updateProductDto.isOnSale = updateProductDto.salePrice < price;
      }

      const updatedProduct = await this.productModel
        .findByIdAndUpdate(id, updateProductDto, {
          new: true,
          runValidators: true,
        })
        .populate('createdBy', 'firstName lastName email')
        .exec();

      return {
        message: 'Product updated successfully',
        product: updatedProduct,
      };
    } catch (error) {
      // Cleanup uploaded images if product update fails
      if (newImageUrls && newImageUrls.length > 0) {
        await this.cloudinaryService.deleteMultipleImages(newImageUrls);
      }
      throw new BadRequestException(
        `Failed to update product: ${error.message}`,
      );
    }
  }

  async deleteProduct(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
    const product = await this.getProductById(id);

    // Check permissions
    if (
      userRole === UserRole.USER ||
      (userRole === UserRole.ADMIN &&
        product.createdBy._id.toString() !== userId)
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this product',
      );
    }

    try {
      // Delete images from Cloudinary
      if (product.images && product.images.length > 0) {
        await this.cloudinaryService.deleteMultipleImages(product.images);
      }

      await this.productModel.findByIdAndDelete(id);

      return {
        message: 'Product deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete product: ${error.message}`,
      );
    }
  }

  async deleteProductImage(
    productId: string,
    imageUrl: string,
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
    const product = await this.getProductById(productId);

    // Check permissions
    if (
      userRole === UserRole.USER ||
      (userRole === UserRole.ADMIN &&
        product.createdBy._id.toString() !== userId)
    ) {
      throw new ForbiddenException(
        'You do not have permission to modify this product',
      );
    }

    if (!product.images.includes(imageUrl)) {
      throw new NotFoundException('Image not found in product');
    }

    try {
      // Delete from Cloudinary
      await this.cloudinaryService.deleteImage(imageUrl);

      // Remove from product images array
      const updatedProduct = await this.productModel
        .findByIdAndUpdate(
          productId,
          { $pull: { images: imageUrl } },
          { new: true },
        )
        .populate('createdBy', 'firstName lastName email')
        .exec();

      return {
        message: 'Image deleted successfully',
        product: updatedProduct,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to delete image: ${error.message}`);
    }
  }

  async getCategories(): Promise<any> {
    const categories = Object.values(ProductCategory).map((category) => ({
      value: category,
      label: category,
    }));

    return {
      categories,
    };
  }

  async getProductStats(): Promise<any> {
    try {
      const [totalProducts, activeProducts, onSaleProducts, categoryStats] =
        await Promise.all([
          this.productModel.countDocuments(),
          this.productModel.countDocuments({ isActive: true }),
          this.productModel.countDocuments({ isOnSale: true }),
          this.productModel.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
        ]);

      return {
        totalProducts,
        activeProducts,
        onSaleProducts,
        categoryStats,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get product stats: ${error.message}`,
      );
    }
  }

  async getLowStockProducts(
    threshold: number = 10,
  ): Promise<ProductDocument[]> {
    try {
      return await this.productModel
        .find({ stock: { $lte: threshold }, isActive: true })
        .populate('createdBy', 'firstName lastName')
        .sort({ stock: 1 })
        .exec();
    } catch (error) {
      throw new BadRequestException(
        `Failed to get low stock products: ${error.message}`,
      );
    }
  }
}
