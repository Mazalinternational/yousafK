import { Module } from '@nestjs/common';
import { StockSyncService } from './stock-sync.service.js';

@Module({
  providers: [StockSyncService],
  exports: [StockSyncService],
})
export class StockModule {}
