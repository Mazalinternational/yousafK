import { Module } from '@nestjs/common';
import { SeasonModule } from '../season/season.module.js';
import { StockModule } from '../stock/stock.module.js';
import { StoreModule } from '../store/store.module.js';
import { PaddyProcessController } from './paddy-process.controller.js';
import { PaddyProcessService } from './paddy-process.service.js';

@Module({
  imports: [SeasonModule, StockModule, StoreModule],
  controllers: [PaddyProcessController],
  providers: [PaddyProcessService],
})
export class PaddyProcessModule {}
