import { Module } from '@nestjs/common';
import { CashModule } from '../cash/cash.module.js';
import { CurrencyModule } from '../currency/currency.module.js';
import { SeasonModule } from '../season/season.module.js';
import { SarafiModule } from '../sarafi/sarafi.module.js';
import { VarietyModule } from '../variety/variety.module.js';
import { CustomerController } from './customer.controller.js';
import { CustomerLedgerService } from './customer-ledger.service.js';
import { CustomerService } from './customer.service.js';

@Module({
  imports: [
    SeasonModule,
    VarietyModule,
    CurrencyModule,
    SarafiModule,
    CashModule,
  ],
  controllers: [CustomerController],
  providers: [CustomerService, CustomerLedgerService],
  exports: [CustomerLedgerService],
})
export class CustomerModule {}
