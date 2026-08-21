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
import { CloseSeasonDto } from './dto/close-season.dto.js';
import { CreateSeasonDto } from './dto/create-season.dto.js';
import { FindSeasonsQueryDto } from './dto/find-seasons-query.dto.js';
import { UpdateSeasonDto } from './dto/update-season.dto.js';
import { SeasonService } from './season.service.js';

@Controller('seasons')
export class SeasonController {
  constructor(private readonly seasonService: SeasonService) {}

  @Post()
  @RequirePermissions('seasons.create')
  async create(@Body() createSeasonDto: CreateSeasonDto) {
    const season = await this.seasonService.create(createSeasonDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Season created successfully',
      data: season,
    };
  }

  @Get()
  @RequirePermissions('seasons.read')
  async findAll(@Query() query: FindSeasonsQueryDto) {
    const seasons = await this.seasonService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Seasons retrieved successfully',
      data: seasons,
    };
  }

  @Get('active')
  @RequirePermissions('seasons.read')
  async getActiveSeason() {
    const season = await this.seasonService.getActiveSeasonOrThrow();

    return {
      statusCode: HttpStatus.OK,
      message: 'Active season retrieved successfully',
      data: season,
    };
  }

  @Get(':id')
  @RequirePermissions('seasons.read')
  async findOne(@Param('id') id: string) {
    const season = await this.seasonService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Season retrieved successfully',
      data: season,
    };
  }

  @Patch(':id')
  @RequirePermissions('seasons.update')
  async update(
    @Param('id') id: string,
    @Body() updateSeasonDto: UpdateSeasonDto,
  ) {
    const season = await this.seasonService.update(id, updateSeasonDto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Season updated successfully',
      data: season,
    };
  }

  @Post(':id/close')
  @RequirePermissions('seasons.update')
  async close(
    @Param('id') id: string,
    @Body() closeSeasonDto?: CloseSeasonDto,
  ) {
    const season = await this.seasonService.close(id, closeSeasonDto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Season closed successfully',
      data: season,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('seasons.delete')
  async remove(@Param('id') id: string) {
    const season = await this.seasonService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Season deleted successfully',
      data: season,
    };
  }
}
