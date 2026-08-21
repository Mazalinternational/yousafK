import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../common/auth/auth-types.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/auth/decorators/permissions.decorator.js';
import { AuditService } from '../audit/audit.service.js';
import { AssignRolesDto } from './dto/assign-roles.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

function actorFrom(req: Request, user: AuthenticatedUser) {
  const { ipAddress, userAgent } = AuditService.extractRequestContext(req);
  return { actorId: user.id, actorEmail: user.email, ipAddress, userAgent };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  async findAll(
    @Query('pageNumber') pageNumber?: string,
    @Query('pageSize') pageSize?: string,
    @Query('query') query?: string,
    @Query('isActive') isActive?: string,
    @Query('role') role?: string,
  ) {
    const data = await this.usersService.findAll({
      pageNumber: pageNumber ? Number(pageNumber) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      query,
      role,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
    return {
      statusCode: HttpStatus.OK,
      message: 'Users retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @RequirePermissions('users.read')
  async findOne(@Param('id') id: string) {
    const data = await this.usersService.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'User retrieved successfully',
      data,
    };
  }

  @Get(':id/sessions')
  @RequirePermissions(['users.read', 'sessions.read'], 'any')
  async sessions(@Param('id') id: string) {
    const data = await this.usersService.listSessions(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Sessions retrieved successfully',
      data,
    };
  }

  @Post()
  @RequirePermissions('users.create')
  async create(
    @Body() dto: CreateUserDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.usersService.create(dto, actorFrom(req, user));
    return {
      statusCode: HttpStatus.CREATED,
      message: 'User created successfully',
      data,
    };
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.usersService.update(id, dto, actorFrom(req, user));
    return {
      statusCode: HttpStatus.OK,
      message: 'User updated successfully',
      data,
    };
  }

  @Patch(':id/enable')
  @RequirePermissions('users.update')
  async enable(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.usersService.setActive(
      id,
      true,
      actorFrom(req, user),
    );
    return { statusCode: HttpStatus.OK, message: 'User enabled', data };
  }

  @Patch(':id/disable')
  @RequirePermissions('users.update')
  async disable(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.usersService.setActive(
      id,
      false,
      actorFrom(req, user),
    );
    return { statusCode: HttpStatus.OK, message: 'User disabled', data };
  }

  @Post(':id/roles')
  @RequirePermissions(['users.assign', 'users.update'], 'any')
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.usersService.assignRoles(
      id,
      dto,
      actorFrom(req, user),
    );
    return { statusCode: HttpStatus.OK, message: 'Roles assigned', data };
  }

  @Post(':id/force-logout')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users.update')
  async forceLogout(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.usersService.forceLogout(id, actorFrom(req, user));
    return { statusCode: HttpStatus.OK, message: 'User sessions revoked' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users.delete')
  async remove(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.usersService.remove(id, actorFrom(req, user));
    return { statusCode: HttpStatus.OK, message: 'User deleted', data };
  }
}
