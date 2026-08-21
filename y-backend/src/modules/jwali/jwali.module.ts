import { Module } from '@nestjs/common';
import { CashModule } from '../cash/cash.module.js';
import { CurrencyModule } from '../currency/currency.module.js';
import { SarafiModule } from '../sarafi/sarafi.module.js';
import { SeasonModule } from '../season/season.module.js';
import { JwaliController } from './jwali.controller.js';
import { JwaliLedgerService } from './jwali-ledger.service.js';
import { JwaliService } from './jwali.service.js';

@Module({
  imports: [SeasonModule, CurrencyModule, SarafiModule, CashModule],
  controllers: [JwaliController],
  providers: [JwaliService, JwaliLedgerService],
})
export class JwaliModule {}
