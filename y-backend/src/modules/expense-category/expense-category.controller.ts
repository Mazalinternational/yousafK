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
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto.js';
import { FindExpenseCategoriesQueryDto } from './dto/find-expense-categories-query.dto.js';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto.js';
import { ExpenseCategoryService } from './expense-category.service.js';

@Controller('expense-categories')
export class ExpenseCategoryController {
  constructor(
    private readonly expenseCategoryService: ExpenseCategoryService,
  ) {}

  @Post()
  @RequirePermissions('expense_categories.create')
  async create(@Body() createDto: CreateExpenseCategoryDto) {
    const category = await this.expenseCategoryService.create(createDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Expense category created successfully',
      data: category,
    };
  }

  @Get()
  @RequirePermissions([
    'expense_categories.read',
    'expense_categories.view',
    'expense_categories.manage',
    'expenses.read',
    'expenses.view',
    'expenses.manage',
  ])
  async findAll(@Query() query: FindExpenseCategoriesQueryDto) {
    const categories = await this.expenseCategoryService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Expense categories retrieved successfully',
      data: categories,
    };
  }

  @Get(':id')
  @RequirePermissions('expense_categories.read')
  async findOne(@Param('id') id: string) {
    const category = await this.expenseCategoryService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Expense category retrieved successfully',
      data: category,
    };
  }

  @Patch(':id')
  @RequirePermissions('expense_categories.update')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateExpenseCategoryDto,
  ) {
    const category = await this.expenseCategoryService.update(id, updateDto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Expense category updated successfully',
      data: category,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('expense_categories.delete')
  async remove(@Param('id') id: string) {
    const result = await this.expenseCategoryService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Expense category deleted successfully',
      data: result,
    };
  }
}
