import { Module } from '@nestjs/common';
import { RiceSaleModule } from '../rice-sale/rice-sale.module.js';
import { SeasonModule } from '../season/season.module.js';
import { VarietyModule } from '../variety/variety.module.js';
import { RiceCharityController } from './rice-charity.controller.js';
import { RiceCharityService } from './rice-charity.service.js';

@Module({
  imports: [SeasonModule, VarietyModule, RiceSaleModule],
  controllers: [RiceCharityController],
  providers: [RiceCharityService],
  exports: [RiceCharityService],
})
export class RiceCharityModule {}
