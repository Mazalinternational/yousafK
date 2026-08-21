import { Module } from '@nestjs/common';
import { SeasonModule } from '../season/season.module.js';
import { StockModule } from '../stock/stock.module.js';
import { VarietyModule } from '../variety/variety.module.js';
import { ProcessRiceController } from './process-rice.controller.js';
import { ProcessRiceService } from './process-rice.service.js';

@Module({
  imports: [SeasonModule, VarietyModule, StockModule],
  controllers: [ProcessRiceController],
  providers: [ProcessRiceService],
})
export class ProcessRiceModule {}
