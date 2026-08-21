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
import { CurrencyService } from './currency.service.js';
import { CreateCurrencyDto } from './dto/create-currency.dto.js';
import { FindCurrenciesQueryDto } from './dto/find-currencies-query.dto.js';
import { UpdateCurrencyDto } from './dto/update-currency.dto.js';

@Controller('currencies')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('allowed-codes')
  @RequirePermissions('currencies.read')
  listAllowedCodes() {
    return {
      statusCode: HttpStatus.OK,
      message: 'Allowed currency codes',
      data: this.currencyService.listAllowedCodes(),
    };
  }

  @Post()
  @RequirePermissions('currencies.create')
  async create(@Body() createCurrencyDto: CreateCurrencyDto) {
    const currency = await this.currencyService.create(createCurrencyDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Currency created successfully',
      data: currency,
    };
  }

  @Get()
  @RequirePermissions([
    'currencies.read',
    'currencies.view',
    'currencies.manage',
    'expenses.read',
    'expenses.view',
    'expenses.manage',
    'cash.read',
    'cash.view',
    'cash.manage',
  ])
  async findAll(@Query() query: FindCurrenciesQueryDto) {
    const currencies = await this.currencyService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Currencies retrieved successfully',
      data: currencies,
    };
  }

  @Get(':id')
  @RequirePermissions('currencies.read')
  async findOne(@Param('id') id: string) {
    const currency = await this.currencyService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Currency retrieved successfully',
      data: currency,
    };
  }

  @Patch(':id')
  @RequirePermissions('currencies.update')
  async update(
    @Param('id') id: string,
    @Body() updateCurrencyDto: UpdateCurrencyDto,
  ) {
    const currency = await this.currencyService.update(id, updateCurrencyDto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Currency updated successfully',
      data: currency,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('currencies.delete')
  async remove(@Param('id') id: string) {
    const result = await this.currencyService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Currency deleted successfully',
      data: result,
    };
  }
}
