import { Module } from '@nestjs/common';
import { CashModule } from '../cash/cash.module.js';
import { CurrencyModule } from '../currency/currency.module.js';
import { CustomerModule } from '../customer/customer.module.js';
import { SarafiModule } from '../sarafi/sarafi.module.js';
import { SeasonModule } from '../season/season.module.js';
import { StockModule } from '../stock/stock.module.js';
import { VarietyModule } from '../variety/variety.module.js';
import { PaddyWarehouseController } from './paddy-warehouse.controller.js';
import { PaddyWarehouseService } from './paddy-warehouse.service.js';

@Module({
  imports: [
    SeasonModule,
    CustomerModule,
    VarietyModule,
    CurrencyModule,
    CashModule,
    SarafiModule,
    StockModule,
  ],
  controllers: [PaddyWarehouseController],
  providers: [PaddyWarehouseService],
})
export class PaddyWarehouseModule {}
