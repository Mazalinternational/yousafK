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
import { CreateProcessRiceDto } from './dto/create-process-rice.dto.js';
import { FindProcessRiceQueryDto } from './dto/find-process-rice-query.dto.js';
import { UpdateProcessRiceDto } from './dto/update-process-rice.dto.js';
import { ProcessRiceService } from './process-rice.service.js';

@Controller('process_rice')
export class ProcessRiceController {
  constructor(private readonly processRiceService: ProcessRiceService) {}

  @Post()
  @RequirePermissions('process_rice.create')
  async create(@Body() createProcessRiceDto: CreateProcessRiceDto) {
    const processRice =
      await this.processRiceService.create(createProcessRiceDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Process rice record created successfully',
      data: processRice,
    };
  }

  @Get()
  @RequirePermissions('process_rice.read')
  async findAll(@Query() query: FindProcessRiceQueryDto) {
    const processRiceEntries = await this.processRiceService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Process rice records retrieved successfully',
      data: processRiceEntries,
    };
  }

  @Get('process-options')
  @RequirePermissions('process_rice.read')
  async getProcessOptions(
    @Query('seasonId') seasonId: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const options = await this.processRiceService.getProcessOptions(
      seasonId,
      excludeId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Process rice options retrieved successfully',
      data: options,
    };
  }

  @Get(':id')
  @RequirePermissions('process_rice.read')
  async findOne(@Param('id') id: string) {
    const processRice = await this.processRiceService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Process rice record retrieved successfully',
      data: processRice,
    };
  }

  @Patch(':id')
  @RequirePermissions('process_rice.update')
  async update(
    @Param('id') id: string,
    @Body() updateProcessRiceDto: UpdateProcessRiceDto,
  ) {
    const processRice = await this.processRiceService.update(
      id,
      updateProcessRiceDto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Process rice record updated successfully',
      data: processRice,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('process_rice.delete')
  async remove(@Param('id') id: string) {
    const processRice = await this.processRiceService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Process rice record deleted successfully',
      data: processRice,
    };
  }
}
