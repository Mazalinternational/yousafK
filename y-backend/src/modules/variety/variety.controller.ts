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
import { CreateVarietyDto } from './dto/create-variety.dto.js';
import { FindVarietiesQueryDto } from './dto/find-varieties-query.dto.js';
import { UpdateVarietyDto } from './dto/update-variety.dto.js';
import { VarietyService } from './variety.service.js';

@Controller('varieties')
export class VarietyController {
  constructor(private readonly varietyService: VarietyService) {}

  @Post()
  @RequirePermissions('varieties.create')
  async create(@Body() dto: CreateVarietyDto) {
    const data = await this.varietyService.create(dto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Variety created successfully',
      data,
    };
  }

  @Get()
  @RequirePermissions([
    'varieties.read',
    'varieties.view',
    'varieties.manage',
    'rice_warehouses.read',
    'rice_warehouses.view',
    'rice_warehouses.manage',
    'paddy_warehouses.read',
    'paddy_warehouses.view',
    'paddy_warehouses.manage',
    'entering_paddy.read',
    'entering_paddy.view',
    'entering_paddy.manage',
    'paddy_processes.read',
    'paddy_processes.view',
    'paddy_processes.manage',
    'process_rice.read',
    'process_rice.view',
    'process_rice.manage',
    'stores.read',
    'stores.view',
    'stores.manage',
    'rice_sales.read',
    'rice_sales.view',
    'rice_sales.manage',
    'customers.read',
    'customers.view',
    'customers.manage',
  ])
  async findAll(@Query() query: FindVarietiesQueryDto) {
    const data = await this.varietyService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Varieties retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @RequirePermissions('varieties.read')
  async findOne(@Param('id') id: string) {
    const data = await this.varietyService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Variety retrieved successfully',
      data,
    };
  }

  @Patch(':id')
  @RequirePermissions('varieties.update')
  async update(@Param('id') id: string, @Body() dto: UpdateVarietyDto) {
    const data = await this.varietyService.update(id, dto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Variety updated successfully',
      data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('varieties.delete')
  async remove(@Param('id') id: string) {
    const data = await this.varietyService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Variety deleted successfully',
      data,
    };
  }
}
