import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { authConfig } from '../../common/auth/auth.config.js';
import { PermissionCacheService } from '../../common/auth/permission-cache.service.js';
import { JwtAccessStrategy } from '../../common/auth/strategies/jwt-access.strategy.js';
import { JwtRefreshStrategy } from '../../common/auth/strategies/jwt-refresh.strategy.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: authConfig.jwt.accessSecret,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    PermissionCacheService,
  ],
  exports: [AuthService, PermissionCacheService, JwtModule],
})
export class AuthModule {}
