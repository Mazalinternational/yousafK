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
import { CreateStoreEntryDto } from './dto/create-store-entry.dto.js';
import { FindStoreEntriesQueryDto } from './dto/find-store-entries-query.dto.js';
import { SellStoreEntryDto } from './dto/sell-store-entry.dto.js';
import { UpdateStoreEntryDto } from './dto/update-store-entry.dto.js';
import { CreateStoreVarietySaleDto } from './dto/create-store-variety-sale.dto.js';
import { FindStoreVarietySalesQueryDto } from './dto/find-store-variety-sales-query.dto.js';
import { UpdateStoreVarietySaleDto } from './dto/update-store-variety-sale.dto.js';
import { StoreService } from './store.service.js';
import { StoreVarietySaleService } from './store-variety-sale.service.js';

@Controller('stores')
export class StoreController {
  constructor(
    private readonly storeService: StoreService,
    private readonly storeVarietySaleService: StoreVarietySaleService,
  ) {}

  @Post()
  @RequirePermissions('stores.create')
  async create(@Body() createStoreEntryDto: CreateStoreEntryDto) {
    const entry = await this.storeService.create(createStoreEntryDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Store entry created successfully',
      data: entry,
    };
  }

  @Post(':id/sell')
  @RequirePermissions('stores.update')
  async sell(
    @Param('id') id: string,
    @Body() sellStoreEntryDto: SellStoreEntryDto,
  ) {
    const entry = await this.storeService.sell(id, sellStoreEntryDto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Store entry sold successfully',
      data: entry,
    };
  }

  @Post('variety-sales')
  @RequirePermissions('stores.update')
  async createVarietySale(@Body() createDto: CreateStoreVarietySaleDto) {
    const sale = await this.storeVarietySaleService.create(createDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Store variety sale created successfully',
      data: sale,
    };
  }

  @Get('variety-sales')
  @RequirePermissions('stores.read')
  async findAllVarietySales(@Query() query: FindStoreVarietySalesQueryDto) {
    const sales = await this.storeVarietySaleService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Store variety sales retrieved successfully',
      data: sales,
    };
  }

  @Get('variety-sales/cash-summary')
  @RequirePermissions('stores.read')
  async getVarietySalesCashSummary(@Query('seasonId') seasonId?: string) {
    const summary =
      await this.storeVarietySaleService.getCashSalesSummary(seasonId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Store variety sales cash summary retrieved successfully',
      data: summary,
    };
  }

  @Get('variety-sales/:id')
  @RequirePermissions('stores.read')
  async findOneVarietySale(@Param('id') id: string) {
    const sale = await this.storeVarietySaleService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Store variety sale retrieved successfully',
      data: sale,
    };
  }

  @Patch('variety-sales/:id')
  @RequirePermissions('stores.update')
  async updateVarietySale(
    @Param('id') id: string,
    @Body() updateDto: UpdateStoreVarietySaleDto,
  ) {
    const sale = await this.storeVarietySaleService.update(id, updateDto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Store variety sale updated successfully',
      data: sale,
    };
  }

  @Delete('variety-sales/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('stores.delete')
  async removeVarietySale(@Param('id') id: string) {
    const sale = await this.storeVarietySaleService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Store variety sale deleted successfully',
      data: sale,
    };
  }

  @Get('dashboard')
  @RequirePermissions('stores.read')
  async getDashboard(@Query('seasonId') seasonId?: string) {
    const dashboard = await this.storeService.getDashboard(seasonId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Store dashboard retrieved successfully',
      data: dashboard,
    };
  }

  @Get('variety-stock')
  @RequirePermissions('stores.read')
  async getVarietyStock(
    @Query('storeType')
    storeType: 'short_green' | 'regection' | 'broken_rice' | 'waste',
    @Query('seasonId') seasonId?: string,
  ) {
    const stock = await this.storeService.getVarietyStock(storeType, seasonId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Store variety stock retrieved successfully',
      data: stock,
    };
  }

  @Get()
  @RequirePermissions('stores.read')
  async findAll(@Query() query: FindStoreEntriesQueryDto) {
    const entries = await this.storeService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Store entries retrieved successfully',
      data: entries,
    };
  }

  @Get('process-options')
  @RequirePermissions('stores.read')
  async getProcessOptions(
    @Query('seasonId') seasonId: string,
    @Query('storeType')
    storeType: 'short_green' | 'regection' | 'broken_rice' | 'waste',
    @Query('excludeId') excludeId?: string,
  ) {
    const options = await this.storeService.getProcessOptions(
      seasonId,
      storeType,
      excludeId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Store process options retrieved successfully',
      data: options,
    };
  }

  @Get(':id')
  @RequirePermissions('stores.read')
  async findOne(@Param('id') id: string) {
    const entry = await this.storeService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Store entry retrieved successfully',
      data: entry,
    };
  }

  @Patch(':id')
  @RequirePermissions('stores.update')
  async update(
    @Param('id') id: string,
    @Body() updateStoreEntryDto: UpdateStoreEntryDto,
  ) {
    const entry = await this.storeService.update(id, updateStoreEntryDto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Store entry updated successfully',
      data: entry,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('stores.delete')
  async remove(@Param('id') id: string) {
    const entry = await this.storeService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Store entry deleted successfully',
      data: entry,
    };
  }
}
