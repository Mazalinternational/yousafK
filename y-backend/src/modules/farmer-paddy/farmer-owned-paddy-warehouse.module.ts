import { Module } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module.js';
import { SeasonModule } from '../season/season.module.js';
import { StockModule } from '../stock/stock.module.js';
import { VarietyModule } from '../variety/variety.module.js';
import { FarmerOwnedPaddyWarehouseController } from './farmer-owned-paddy-warehouse.controller.js';
import { FarmerOwnedPaddyWarehouseService } from './farmer-owned-paddy-warehouse.service.js';

@Module({
  imports: [SeasonModule, CustomerModule, VarietyModule, StockModule],
  controllers: [FarmerOwnedPaddyWarehouseController],
  providers: [FarmerOwnedPaddyWarehouseService],
})
export class FarmerOwnedPaddyWarehouseModule {}
