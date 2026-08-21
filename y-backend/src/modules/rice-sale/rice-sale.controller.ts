import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '../../common/auth/decorators/permissions.decorator.js';
import { CreateRiceSaleDto } from './dto/create-rice-sale.dto.js';
import { FindRiceSalesQueryDto } from './dto/find-rice-sales-query.dto.js';
import { UpdateRiceSaleDto } from './dto/update-rice-sale.dto.js';
import { RiceSaleService } from './rice-sale.service.js';

@Controller('rice_sales')
export class RiceSaleController {
  constructor(private readonly riceSaleService: RiceSaleService) {}

  @Post()
  @RequirePermissions('rice_sales.create')
  async create(@Body() createRiceSaleDto: CreateRiceSaleDto) {
    const sale = await this.riceSaleService.create(createRiceSaleDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Rice sale recorded successfully',
      data: sale,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('rice_sales.read')
  async findAll(@Query() query: FindRiceSalesQueryDto) {
    const sales = await this.riceSaleService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Rice sales retrieved successfully',
      data: sales,
    };
  }

  @Get('cash-summary')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('rice_sales.read')
  async getCashSalesSummary(@Query('seasonId') seasonId?: string) {
    const summary = await this.riceSaleService.getCashSalesSummary(seasonId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Rice sales cash summary retrieved successfully',
      data: summary,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('rice_sales.read')
  async findOne(@Param('id') id: string) {
    const sale = await this.riceSaleService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Rice sale retrieved successfully',
      data: sale,
    };
  }

  @Patch(':id')
  @RequirePermissions('rice_sales.update')
  async update(
    @Param('id') id: string,
    @Body() updateRiceSaleDto: UpdateRiceSaleDto,
  ) {
    const sale = await this.riceSaleService.update(id, updateRiceSaleDto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Rice sale updated successfully',
      data: sale,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('rice_sales.delete')
  async remove(@Param('id') id: string) {
    const sale = await this.riceSaleService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Rice sale deleted successfully',
      data: sale,
    };
  }
}
