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
import { CreatePaddyProcessDto } from './dto/create-paddy-process.dto.js';
import { FindPaddyProcessesQueryDto } from './dto/find-paddy-processes-query.dto.js';
import { UpdatePaddyProcessDto } from './dto/update-paddy-process.dto.js';
import { PaddyProcessService } from './paddy-process.service.js';

@Controller('paddy_process')
export class PaddyProcessController {
  constructor(private readonly paddyProcessService: PaddyProcessService) {}

  @Post()
  @RequirePermissions('paddy_processes.create')
  async create(@Body() createPaddyProcessDto: CreatePaddyProcessDto) {
    const paddyProcess = await this.paddyProcessService.create(
      createPaddyProcessDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Paddy process created successfully',
      data: paddyProcess,
    };
  }

  @Get()
  @RequirePermissions('paddy_processes.read')
  async findAll(@Query() query: FindPaddyProcessesQueryDto) {
    const paddyProcesses = await this.paddyProcessService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Paddy process records retrieved successfully',
      data: paddyProcesses,
    };
  }

  @Get('dashboard')
  @RequirePermissions('paddy_processes.read')
  async getDashboard(@Query('seasonId') seasonId?: string) {
    const dashboard = await this.paddyProcessService.getDashboard(seasonId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Paddy process dashboard retrieved successfully',
      data: dashboard,
    };
  }

  @Get('store-stock')
  @RequirePermissions('paddy_processes.read')
  async getStoreSourceAvailability(
    @Query('seasonId') seasonId: string,
    @Query('storeType') storeType: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const availability =
      await this.paddyProcessService.getStoreSourceAvailability(
        seasonId,
        storeType,
        excludeId,
      );

    return {
      statusCode: HttpStatus.OK,
      message: 'Paddy process store stock retrieved successfully',
      data: availability,
    };
  }

  @Get('stock')
  @RequirePermissions('paddy_processes.read')
  async getAvailability(
    @Query('seasonId') seasonId: string,
    @Query('variety') variety?: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const availability = await this.paddyProcessService.getAvailability(
      seasonId,
      variety,
      excludeId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Paddy process stock retrieved successfully',
      data: availability,
    };
  }

  @Get(':id')
  @RequirePermissions('paddy_processes.read')
  async findOne(@Param('id') id: string) {
    const paddyProcess = await this.paddyProcessService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Paddy process record retrieved successfully',
      data: paddyProcess,
    };
  }

  @Patch(':id')
  @RequirePermissions('paddy_processes.update')
  async update(
    @Param('id') id: string,
    @Body() updatePaddyProcessDto: UpdatePaddyProcessDto,
  ) {
    const paddyProcess = await this.paddyProcessService.update(
      id,
      updatePaddyProcessDto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Paddy process record updated successfully',
      data: paddyProcess,
    };
  }

  @Patch(':id/complete')
  @RequirePermissions('paddy_processes.update')
  async complete(@Param('id') id: string) {
    const paddyProcess = await this.paddyProcessService.complete(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Paddy process record marked as completed successfully',
      data: paddyProcess,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('paddy_processes.delete')
  async remove(@Param('id') id: string) {
    const paddyProcess = await this.paddyProcessService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Paddy process record deleted successfully',
      data: paddyProcess,
    };
  }
}
