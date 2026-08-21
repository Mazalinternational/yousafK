import { Module } from '@nestjs/common';
import { CashModule } from '../cash/cash.module.js';
import { CurrencyModule } from '../currency/currency.module.js';
import { CustomerModule } from '../customer/customer.module.js';
import { ExpenseCategoryModule } from '../expense-category/expense-category.module.js';
import { SarafiModule } from '../sarafi/sarafi.module.js';
import { SeasonModule } from '../season/season.module.js';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';

@Module({
  imports: [
    SeasonModule,
    CurrencyModule,
    ExpenseCategoryModule,
    SarafiModule,
    CashModule,
    CustomerModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
