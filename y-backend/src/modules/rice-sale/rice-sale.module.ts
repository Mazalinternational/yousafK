import { Module } from '@nestjs/common';
import { CashModule } from '../cash/cash.module.js';
import { CurrencyModule } from '../currency/currency.module.js';
import { SarafiModule } from '../sarafi/sarafi.module.js';
import { SeasonModule } from '../season/season.module.js';
import { VarietyModule } from '../variety/variety.module.js';
import { RiceSaleController } from './rice-sale.controller.js';
import { RiceSaleService } from './rice-sale.service.js';

@Module({
  imports: [
    SeasonModule,
    VarietyModule,
    CurrencyModule,
    SarafiModule,
    CashModule,
  ],
  controllers: [RiceSaleController],
  providers: [RiceSaleService],
  exports: [RiceSaleService],
})
export class RiceSaleModule {}
