import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { Public } from '../../common/auth/decorators/public.decorator.js';
import { SkipCsrf } from '../../common/auth/decorators/skip-csrf.decorator.js';
import { JwtRefreshGuard } from '../../common/auth/guards/jwt-refresh.guard.js';
import type {
  AuthenticatedUser,
  RefreshTokenPayload,
} from '../../common/auth/auth-types.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { MAX_PROFILE_PICTURE_BYTES } from './profile-picture.util.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/login — anonymous, mints tokens. */
  @Public()
  @SkipCsrf()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ctx = AuditService.extractRequestContext(req);
    const result = await this.authService.login(dto, res, ctx);
    return {
      statusCode: HttpStatus.OK,
      message: 'Logged in successfully',
      data: result,
    };
  }

  /** POST /auth/refresh — uses refresh cookie, rotates tokens. */
  @Public()
  @SkipCsrf()
  @UseGuards(JwtRefreshGuard)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const auth = (
      req as Request & { user?: { payload: RefreshTokenPayload; raw: string } }
    ).user;
    if (!auth) {
      return { statusCode: HttpStatus.UNAUTHORIZED, message: 'Refresh failed' };
    }
    const ctx = AuditService.extractRequestContext(req);
    const result = await this.authService.refresh(
      auth.raw,
      auth.payload,
      res,
      ctx,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Token refreshed',
      data: result,
    };
  }

  /** POST /auth/logout — revokes session + refresh token. */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ctx = AuditService.extractRequestContext(req);
    await this.authService.logout(user.id, user.sessionId, res, ctx);
    return {
      statusCode: HttpStatus.OK,
      message: 'Logged out successfully',
    };
  }

  /** GET /auth/me — current user, called by frontend on app boot. */
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.authService.getMe(user.id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Current user',
      data: { user: data },
    };
  }

  @Public()
  @SkipCsrf()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const ctx = AuditService.extractRequestContext(req);
    await this.authService.forgotPassword(dto, ctx);
    return {
      statusCode: HttpStatus.OK,
      message:
        'If an account exists for that email, a reset link has been issued.',
    };
  }

  @Public()
  @SkipCsrf()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    const ctx = AuditService.extractRequestContext(req);
    await this.authService.resetPassword(dto, ctx);
    return {
      statusCode: HttpStatus.OK,
      message: 'Password reset successfully. Please log in.',
    };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const ctx = AuditService.extractRequestContext(req);
    await this.authService.changePassword(user.id, dto, ctx);
    return {
      statusCode: HttpStatus.OK,
      message: 'Password changed successfully',
    };
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.authService.updateProfile(user.id, dto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Profile updated successfully',
      data: { user: updated },
    };
  }

  @Post('profile/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PROFILE_PICTURE_BYTES },
    }),
  )
  async uploadProfileAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          mimetype: string;
          size: number;
        }
      | undefined,
  ) {
    const updated = await this.authService.uploadProfilePicture(user.id, file);
    return {
      statusCode: HttpStatus.OK,
      message: 'Profile picture updated successfully',
      data: { user: updated },
    };
  }

  @Delete('profile/avatar')
  @HttpCode(HttpStatus.OK)
  async removeProfileAvatar(@CurrentUser() user: AuthenticatedUser) {
    const updated = await this.authService.removeProfilePicture(user.id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Profile picture removed successfully',
      data: { user: updated },
    };
  }
}
