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
import { CreateRiceWarehouseDto } from './dto/create-rice-warehouse.dto.js';
import { FindRiceWarehousesQueryDto } from './dto/find-rice-warehouses-query.dto.js';
import { UpdateRiceWarehouseDto } from './dto/update-rice-warehouse.dto.js';
import { RiceWarehouseService } from './rice-warehouse.service.js';

@Controller('rice_warehouse')
export class RiceWarehouseController {
  constructor(private readonly riceWarehouseService: RiceWarehouseService) {}

  @Post()
  @RequirePermissions('rice_warehouses.create')
  async create(@Body() createRiceWarehouseDto: CreateRiceWarehouseDto) {
    const riceWarehouse = await this.riceWarehouseService.create(
      createRiceWarehouseDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Rice warehouse record created successfully',
      data: riceWarehouse,
    };
  }

  @Get()
  @RequirePermissions('rice_warehouses.read')
  async findAll(@Query() query: FindRiceWarehousesQueryDto) {
    const riceWarehouses = await this.riceWarehouseService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Rice warehouse records retrieved successfully',
      data: riceWarehouses,
    };
  }

  @Get('dashboard')
  @RequirePermissions('rice_warehouses.read')
  async getDashboard(@Query('seasonId') seasonId?: string) {
    const dashboard = await this.riceWarehouseService.getDashboard(seasonId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Rice warehouse dashboard retrieved successfully',
      data: dashboard,
    };
  }

  @Get(':id')
  @RequirePermissions('rice_warehouses.read')
  async findOne(@Param('id') id: string) {
    const riceWarehouse = await this.riceWarehouseService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Rice warehouse record retrieved successfully',
      data: riceWarehouse,
    };
  }

  @Patch(':id')
  @RequirePermissions('rice_warehouses.update')
  async update(
    @Param('id') id: string,
    @Body() updateRiceWarehouseDto: UpdateRiceWarehouseDto,
  ) {
    const riceWarehouse = await this.riceWarehouseService.update(
      id,
      updateRiceWarehouseDto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Rice warehouse record updated successfully',
      data: riceWarehouse,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('rice_warehouses.delete')
  async remove(@Param('id') id: string) {
    const riceWarehouse = await this.riceWarehouseService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Rice warehouse record deleted successfully',
      data: riceWarehouse,
    };
  }
}
