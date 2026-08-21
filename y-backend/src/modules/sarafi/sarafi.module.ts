import { Module } from '@nestjs/common';
import { CurrencyModule } from '../currency/currency.module.js';
import { SeasonModule } from '../season/season.module.js';
import { SarafLedgerService } from './saraf-ledger.service.js';
import { SarafService } from './saraf.service.js';
import { SarafiController } from './sarafi.controller.js';

@Module({
  imports: [SeasonModule, CurrencyModule],
  controllers: [SarafiController],
  providers: [SarafService, SarafLedgerService],
  exports: [SarafService, SarafLedgerService],
})
export class SarafiModule {}
