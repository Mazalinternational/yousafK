import { Module } from '@nestjs/common';
import { ExpenseCategoryController } from './expense-category.controller.js';
import { ExpenseCategoryService } from './expense-category.service.js';

@Module({
  controllers: [ExpenseCategoryController],
  providers: [ExpenseCategoryService],
  exports: [ExpenseCategoryService],
})
export class ExpenseCategoryModule {}
