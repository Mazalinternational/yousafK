import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller.js';
import { PermissionsSyncService } from './permissions-sync.service.js';

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsSyncService],
})
export class PermissionsModule {}
