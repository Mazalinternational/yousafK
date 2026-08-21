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
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { FindExpensesQueryDto } from './dto/find-expenses-query.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { ExpensesService } from './expenses.service.js';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @RequirePermissions('expenses.create')
  async create(@Body() createExpenseDto: CreateExpenseDto) {
    const expense = await this.expensesService.create(createExpenseDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Expense created successfully',
      data: expense,
    };
  }

  @Get()
  @RequirePermissions('expenses.read')
  async findAll(@Query() query: FindExpensesQueryDto) {
    const expenses = await this.expensesService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Expenses retrieved successfully',
      data: expenses,
    };
  }

  @Get('dashboard')
  @RequirePermissions('expenses.read')
  async getDashboard(@Query('seasonId') seasonId?: string) {
    const dashboard = await this.expensesService.getDashboard(seasonId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Expenses dashboard retrieved successfully',
      data: dashboard,
    };
  }

  @Get('cash-summary')
  @RequirePermissions('expenses.read')
  async getCashPaymentsSummary(@Query('seasonId') seasonId?: string) {
    const summary = await this.expensesService.getCashPaymentsSummary(seasonId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Expense cash payments summary retrieved successfully',
      data: summary,
    };
  }

  @Get(':id')
  @RequirePermissions('expenses.read')
  async findOne(@Param('id') id: string) {
    const expense = await this.expensesService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Expense retrieved successfully',
      data: expense,
    };
  }

  @Patch(':id')
  @RequirePermissions('expenses.update')
  async update(
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    const expense = await this.expensesService.update(id, updateExpenseDto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Expense updated successfully',
      data: expense,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('expenses.delete')
  async remove(@Param('id') id: string) {
    const expense = await this.expensesService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Expense deleted successfully',
      data: expense,
    };
  }
}
