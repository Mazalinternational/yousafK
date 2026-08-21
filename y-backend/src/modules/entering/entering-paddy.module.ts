import { Module } from '@nestjs/common';
import { SeasonModule } from '../season/season.module.js';
import { VarietyModule } from '../variety/variety.module.js';
import { EnteringPaddyController } from './entering-paddy.controller.js';
import { EnteringPaddyService } from './entering-paddy.service.js';

@Module({
  imports: [SeasonModule, VarietyModule],
  controllers: [EnteringPaddyController],
  providers: [EnteringPaddyService],
})
export class EnteringPaddyModule {}
