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
import { CreatePaddyWarehouseDto } from './dto/create-paddy-warehouse.dto.js';
import { FindPaddyWarehousesQueryDto } from './dto/find-paddy-warehouses-query.dto.js';
import { UpdatePaddyWarehouseDto } from './dto/update-paddy-warehouse.dto.js';
import { PaddyWarehouseService } from './paddy-warehouse.service.js';

@Controller('campany_owned_paddy')
export class PaddyWarehouseController {
  constructor(private readonly paddyWarehouseService: PaddyWarehouseService) {}

  @Post()
  @RequirePermissions('paddy_warehouses.create')
  async create(@Body() createPaddyWarehouseDto: CreatePaddyWarehouseDto) {
    const paddyWarehouse = await this.paddyWarehouseService.create(
      createPaddyWarehouseDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Company owned paddy created successfully',
      data: paddyWarehouse,
    };
  }

  @Get()
  @RequirePermissions('paddy_warehouses.read')
  async findAll(@Query() query: FindPaddyWarehousesQueryDto) {
    const paddyWarehouses = await this.paddyWarehouseService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Company owned paddy records retrieved successfully',
      data: paddyWarehouses,
    };
  }

  @Get('dashboard')
  @RequirePermissions('paddy_warehouses.read')
  async getDashboard(@Query('seasonId') seasonId?: string) {
    const dashboard = await this.paddyWarehouseService.getDashboard(seasonId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Paddy warehouse dashboard retrieved successfully',
      data: dashboard,
    };
  }

  @Get('cash-summary')
  @RequirePermissions('paddy_warehouses.read')
  async getCashPaymentsSummary(@Query('seasonId') seasonId?: string) {
    const summary =
      await this.paddyWarehouseService.getCashPaymentsSummary(seasonId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Company paddy cash payments summary retrieved successfully',
      data: summary,
    };
  }

  @Get(':id')
  @RequirePermissions('paddy_warehouses.read')
  async findOne(@Param('id') id: string) {
    const paddyWarehouse = await this.paddyWarehouseService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Company owned paddy record retrieved successfully',
      data: paddyWarehouse,
    };
  }

  @Patch(':id')
  @RequirePermissions('paddy_warehouses.update')
  async update(
    @Param('id') id: string,
    @Body() updatePaddyWarehouseDto: UpdatePaddyWarehouseDto,
  ) {
    const paddyWarehouse = await this.paddyWarehouseService.update(
      id,
      updatePaddyWarehouseDto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Company owned paddy record updated successfully',
      data: paddyWarehouse,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('paddy_warehouses.delete')
  async remove(@Param('id') id: string) {
    const paddyWarehouse = await this.paddyWarehouseService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Company owned paddy record deleted successfully',
      data: paddyWarehouse,
    };
  }
}
