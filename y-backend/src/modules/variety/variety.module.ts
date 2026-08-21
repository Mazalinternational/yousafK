import { Module } from '@nestjs/common';
import { VarietyController } from './variety.controller.js';
import { VarietyService } from './variety.service.js';

@Module({
  controllers: [VarietyController],
  providers: [VarietyService],
  exports: [VarietyService],
})
export class VarietyModule {}
