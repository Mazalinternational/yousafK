import { Module } from '@nestjs/common';
import { CurrencyModule } from '../currency/currency.module.js';
import { SeasonModule } from '../season/season.module.js';
import { CashController } from './cash.controller.js';
import { CashService } from './cash.service.js';

@Module({
  imports: [SeasonModule, CurrencyModule],
  controllers: [CashController],
  providers: [CashService],
  exports: [CashService],
})
export class CashModule {}
