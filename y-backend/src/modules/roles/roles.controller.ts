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
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../common/auth/auth-types.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/auth/decorators/permissions.decorator.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { SetPermissionsDto } from './dto/set-permissions.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { RolesService } from './roles.service.js';

function actorFrom(req: Request, user: AuthenticatedUser) {
  const { ipAddress, userAgent } = AuditService.extractRequestContext(req);
  return { actorId: user.id, actorEmail: user.email, ipAddress, userAgent };
}

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.read')
  async findAll() {
    const data = await this.rolesService.findAll();
    return {
      statusCode: HttpStatus.OK,
      message: 'Roles retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @RequirePermissions('roles.read')
  async findOne(@Param('id') id: string) {
    const data = await this.rolesService.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Role retrieved successfully',
      data,
    };
  }

  @Post()
  @RequirePermissions('roles.create')
  async create(
    @Body() dto: CreateRoleDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.rolesService.create(dto, actorFrom(req, user));
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Role created successfully',
      data,
    };
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.rolesService.update(id, dto, actorFrom(req, user));
    return {
      statusCode: HttpStatus.OK,
      message: 'Role updated successfully',
      data,
    };
  }

  @Put(':id/permissions')
  @RequirePermissions('roles.update')
  async setPermissions(
    @Param('id') id: string,
    @Body() dto: SetPermissionsDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.rolesService.setPermissions(
      id,
      dto,
      actorFrom(req, user),
    );
    return { statusCode: HttpStatus.OK, message: 'Permissions updated', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('roles.delete')
  async remove(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.rolesService.remove(id, actorFrom(req, user));
    return { statusCode: HttpStatus.OK, message: 'Role deleted', data };
  }
}
