import { Module } from '@nestjs/common';
import { CashModule } from '../cash/cash.module.js';
import { RiceSaleModule } from '../rice-sale/rice-sale.module.js';
import { SeasonModule } from '../season/season.module.js';
import { StockModule } from '../stock/stock.module.js';
import { ReportSnapshotsService } from './report-snapshots.service.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [SeasonModule, CashModule, RiceSaleModule, StockModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportSnapshotsService],
})
export class ReportsModule {}
