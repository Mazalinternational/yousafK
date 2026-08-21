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
import { CashService } from './cash.service.js';
import { CreateCashTransactionDto } from './dto/create-cash-transaction.dto.js';
import { FindCashTransactionsQueryDto } from './dto/find-cash-transactions-query.dto.js';
import { UpdateCashTransactionDto } from './dto/update-cash-transaction.dto.js';

@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get('dashboard')
  @RequirePermissions(['cash.read', 'cash.view', 'cash.manage'])
  async getDashboard(@Query('seasonId') seasonId?: string) {
    const dashboard = await this.cashService.getDashboard(seasonId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Cash dashboard retrieved successfully',
      data: dashboard,
    };
  }

  @Get('transactions')
  @RequirePermissions(['cash.read', 'cash.view', 'cash.manage'])
  async findAll(@Query() query: FindCashTransactionsQueryDto) {
    const transactions = await this.cashService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Cash transactions retrieved successfully',
      data: transactions,
    };
  }

  @Post('transactions')
  @RequirePermissions('cash.create')
  async create(@Body() createDto: CreateCashTransactionDto) {
    const transaction = await this.cashService.create(createDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Cash transaction created successfully',
      data: transaction,
    };
  }

  @Get('transactions/:id')
  @RequirePermissions('cash.read')
  async findOne(@Param('id') id: string) {
    const transaction = await this.cashService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Cash transaction retrieved successfully',
      data: transaction,
    };
  }

  @Patch('transactions/:id')
  @RequirePermissions('cash.update')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCashTransactionDto,
  ) {
    const transaction = await this.cashService.update(id, updateDto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Cash transaction updated successfully',
      data: transaction,
    };
  }

  @Delete('transactions/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('cash.delete')
  async remove(@Param('id') id: string) {
    const result = await this.cashService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Cash transaction deleted successfully',
      data: result,
    };
  }
}
