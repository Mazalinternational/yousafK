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
} from '@nestjs/common';
import { RequirePermissions } from '../../common/auth/decorators/permissions.decorator.js';
import { CreateEnteringPaddyDto } from './dto/create-entering-paddy.dto.js';
import { EnteringPaddyDashboardDto } from './dto/entering-paddy-dashboard.dto.js';
import { FindEnteringPaddiesQueryDto } from './dto/find-entering-paddies-query.dto.js';
import { UpdateEnteringPaddyDto } from './dto/update-entering-paddy.dto.js';
import { EnteringPaddyService } from './entering-paddy.service.js';

@Controller('entering_paddy')
export class EnteringPaddyController {
  constructor(private readonly enteringPaddyService: EnteringPaddyService) {}

  @Post()
  @RequirePermissions('entering_paddy.create')
  async create(@Body() createEnteringPaddyDto: CreateEnteringPaddyDto) {
    const enteringPaddy = await this.enteringPaddyService.create(
      createEnteringPaddyDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Entering paddy created successfully',
      data: enteringPaddy,
    };
  }

  @Get()
  @RequirePermissions('entering_paddy.read')
  async findAll(@Query() query: FindEnteringPaddiesQueryDto) {
    const enteringPaddies = await this.enteringPaddyService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Entering paddy records retrieved successfully',
      data: enteringPaddies,
    };
  }

  @Get('dashboard')
  @RequirePermissions('entering_paddy.read')
  async getDashboard(@Query('seasonId') seasonId?: string): Promise<{
    statusCode: HttpStatus;
    message: string;
    data: EnteringPaddyDashboardDto;
  }> {
    const dashboard = await this.enteringPaddyService.getDashboard(seasonId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Entering paddy dashboard retrieved successfully',
      data: dashboard,
    };
  }

  @Get(':id')
  @RequirePermissions('entering_paddy.read')
  async findOne(@Param('id') id: string) {
    const enteringPaddy = await this.enteringPaddyService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Entering paddy record retrieved successfully',
      data: enteringPaddy,
    };
  }

  @Patch(':id')
  @RequirePermissions('entering_paddy.update')
  async update(
    @Param('id') id: string,
    @Body() updateEnteringPaddyDto: UpdateEnteringPaddyDto,
  ) {
    const enteringPaddy = await this.enteringPaddyService.update(
      id,
      updateEnteringPaddyDto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Entering paddy record updated successfully',
      data: enteringPaddy,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('entering_paddy.delete')
  async remove(@Param('id') id: string) {
    const enteringPaddy = await this.enteringPaddyService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Entering paddy record deleted successfully',
      data: enteringPaddy,
    };
  }
}
