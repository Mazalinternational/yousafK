import { Module } from '@nestjs/common';
import { CashModule } from '../cash/cash.module.js';
import { CurrencyModule } from '../currency/currency.module.js';
import { SarafiModule } from '../sarafi/sarafi.module.js';
import { SeasonModule } from '../season/season.module.js';
import { EmployeeController } from './employee.controller.js';
import { EmployeeLedgerService } from './employee-ledger.service.js';
import { EmployeeService } from './employee.service.js';

@Module({
  imports: [SeasonModule, CurrencyModule, SarafiModule, CashModule],
  controllers: [EmployeeController],
  providers: [EmployeeService, EmployeeLedgerService],
})
export class EmployeeModule {}
