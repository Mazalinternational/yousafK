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
import { CreateFarmerOwnedPaddyWarehouseDto } from './dto/create-farmer-owned-paddy-warehouse.dto.js';
import { FindFarmerOwnedPaddyWarehousesQueryDto } from './dto/find-farmer-owned-paddy-warehouses-query.dto.js';
import { UpdateFarmerOwnedPaddyWarehouseDto } from './dto/update-farmer-owned-paddy-warehouse.dto.js';
import { FarmerOwnedPaddyWarehouseService } from './farmer-owned-paddy-warehouse.service.js';

@Controller('farmer_owned_paddy')
export class FarmerOwnedPaddyWarehouseController {
  constructor(
    private readonly farmerOwnedPaddyWarehouseService: FarmerOwnedPaddyWarehouseService,
  ) {}

  @Post()
  @RequirePermissions('paddy_warehouses.create')
  async create(
    @Body()
    createFarmerOwnedPaddyWarehouseDto: CreateFarmerOwnedPaddyWarehouseDto,
  ) {
    const farmerOwnedPaddyWarehouse =
      await this.farmerOwnedPaddyWarehouseService.create(
        createFarmerOwnedPaddyWarehouseDto,
      );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Farmer owned paddy created successfully',
      data: farmerOwnedPaddyWarehouse,
    };
  }

  @Get()
  @RequirePermissions('paddy_warehouses.read')
  async findAll(@Query() query: FindFarmerOwnedPaddyWarehousesQueryDto) {
    const farmerOwnedPaddyWarehouses =
      await this.farmerOwnedPaddyWarehouseService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Farmer owned paddy records retrieved successfully',
      data: farmerOwnedPaddyWarehouses,
    };
  }

  @Get(':id')
  @RequirePermissions('paddy_warehouses.read')
  async findOne(@Param('id') id: string) {
    const farmerOwnedPaddyWarehouse =
      await this.farmerOwnedPaddyWarehouseService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Farmer owned paddy record retrieved successfully',
      data: farmerOwnedPaddyWarehouse,
    };
  }

  @Patch(':id')
  @RequirePermissions('paddy_warehouses.update')
  async update(
    @Param('id') id: string,
    @Body()
    updateFarmerOwnedPaddyWarehouseDto: UpdateFarmerOwnedPaddyWarehouseDto,
  ) {
    const farmerOwnedPaddyWarehouse =
      await this.farmerOwnedPaddyWarehouseService.update(
        id,
        updateFarmerOwnedPaddyWarehouseDto,
      );

    return {
      statusCode: HttpStatus.OK,
      message: 'Farmer owned paddy record updated successfully',
      data: farmerOwnedPaddyWarehouse,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('paddy_warehouses.delete')
  async remove(@Param('id') id: string) {
    const farmerOwnedPaddyWarehouse =
      await this.farmerOwnedPaddyWarehouseService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Farmer owned paddy record deleted successfully',
      data: farmerOwnedPaddyWarehouse,
    };
  }
}
