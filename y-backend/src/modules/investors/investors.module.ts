import { Module } from '@nestjs/common';
import { SeasonModule } from '../season/season.module.js';
import { InvestorsController } from './investors.controller.js';
import { InvestorsService } from './investors.service.js';

@Module({
  imports: [SeasonModule],
  controllers: [InvestorsController],
  providers: [InvestorsService],
  exports: [InvestorsService],
})
export class InvestorsModule {}
