import { Module } from '@nestjs/common';
import { CashModule } from '../cash/cash.module.js';
import { CurrencyModule } from '../currency/currency.module.js';
import { SarafiModule } from '../sarafi/sarafi.module.js';
import { SeasonModule } from '../season/season.module.js';
import { StoreController } from './store.controller.js';
import { StoreService } from './store.service.js';
import { StoreVarietySaleService } from './store-variety-sale.service.js';

@Module({
  imports: [SeasonModule, CurrencyModule, SarafiModule, CashModule],
  controllers: [StoreController],
  providers: [StoreService, StoreVarietySaleService],
  exports: [StoreService],
})
export class StoreModule {}
