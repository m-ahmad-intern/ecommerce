import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { SaleService, ApplySaleDto, BulkSaleDto } from './sale.service';

class ApplySaleRequest {
  productIds: string[];
  discountPercentage?: number;
  salePrice?: number;
  startDate?: string;
  endDate?: string;
  notifyUsers?: boolean;
}

class BulkSaleRequest {
  category?: string;
  discountPercentage: number;
  startDate?: string;
  endDate?: string;
  notifyUsers?: boolean;
}

class RemoveSaleRequest {
  productIds: string[];
}

@ApiTags('Sales Management')
@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Post('apply')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Apply sale to specific products' })
  @ApiResponse({ status: 200, description: 'Sale applied successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Products not found' })
  async applySale(@Body() applySaleRequest: ApplySaleRequest) {
    const applySaleDto: ApplySaleDto = {
      ...applySaleRequest,
      startDate: applySaleRequest.startDate ? new Date(applySaleRequest.startDate) : undefined,
      endDate: applySaleRequest.endDate ? new Date(applySaleRequest.endDate) : undefined,
    };

    const result = await this.saleService.applySaleToProducts(applySaleDto);
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Sale applied successfully',
      data: result,
    };
  }

  @Post('bulk-apply')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Apply bulk sale to products by category' })
  @ApiResponse({ status: 200, description: 'Bulk sale applied successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'No products found' })
  async applyBulkSale(@Body() bulkSaleRequest: BulkSaleRequest) {
    const bulkSaleDto: BulkSaleDto = {
      ...bulkSaleRequest,
      startDate: bulkSaleRequest.startDate ? new Date(bulkSaleRequest.startDate) : undefined,
      endDate: bulkSaleRequest.endDate ? new Date(bulkSaleRequest.endDate) : undefined,
    };

    const result = await this.saleService.applyBulkSale(bulkSaleDto);
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Bulk sale applied successfully',
      data: result,
    };
  }

  @Delete('remove')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove sale from specific products' })
  @ApiResponse({ status: 200, description: 'Sale removed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async removeSale(@Body() removeSaleRequest: RemoveSaleRequest) {
    const result = await this.saleService.removeSaleFromProducts(removeSaleRequest.productIds);
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Sale removed successfully',
      data: result,
    };
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all products currently on sale' })
  @ApiResponse({ status: 200, description: 'Products on sale retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async getProductsOnSale(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    const result = await this.saleService.getProductsOnSale(pageNum, limitNum);
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Products on sale retrieved successfully',
      data: result,
    };
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get sale statistics for admin dashboard' })
  @ApiResponse({ status: 200, description: 'Sale statistics retrieved successfully' })
  async getSaleStatistics() {
    const result = await this.saleService.getSaleStatistics();
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Sale statistics retrieved successfully',
      data: result,
    };
  }

  @Post('cleanup-expired')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clean up expired sales' })
  @ApiResponse({ status: 200, description: 'Expired sales cleaned up successfully' })
  async cleanupExpiredSales() {
    const result = await this.saleService.cleanupExpiredSales();
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Expired sales cleaned up successfully',
      data: result,
    };
  }

  @Post('schedule')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Schedule a future sale' })
  @ApiResponse({ status: 200, description: 'Sale scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid schedule data' })
  async scheduleSale(@Body() applySaleRequest: ApplySaleRequest) {
    const applySaleDto: ApplySaleDto = {
      ...applySaleRequest,
      startDate: applySaleRequest.startDate ? new Date(applySaleRequest.startDate) : undefined,
      endDate: applySaleRequest.endDate ? new Date(applySaleRequest.endDate) : undefined,
    };

    const result = await this.saleService.scheduleSale(applySaleDto);
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Sale scheduled successfully',
      data: result,
    };
  }
}
