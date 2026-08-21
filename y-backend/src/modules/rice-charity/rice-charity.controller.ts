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
import { CreateRiceCharityDto } from './dto/create-rice-charity.dto.js';
import { FindRiceCharitiesQueryDto } from './dto/find-rice-charities-query.dto.js';
import { UpdateRiceCharityDto } from './dto/update-rice-charity.dto.js';
import { RiceCharityService } from './rice-charity.service.js';

@Controller('rice_charities')
export class RiceCharityController {
  constructor(private readonly riceCharityService: RiceCharityService) {}

  @Post()
  @RequirePermissions('rice_charities.create')
  async create(@Body() createRiceCharityDto: CreateRiceCharityDto) {
    const charity = await this.riceCharityService.create(createRiceCharityDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Rice charity recorded successfully',
      data: charity,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('rice_charities.read')
  async findAll(@Query() query: FindRiceCharitiesQueryDto) {
    const charities = await this.riceCharityService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Rice charities retrieved successfully',
      data: charities,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('rice_charities.read')
  async findOne(@Param('id') id: string) {
    const charity = await this.riceCharityService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Rice charity retrieved successfully',
      data: charity,
    };
  }

  @Patch(':id')
  @RequirePermissions('rice_charities.update')
  async update(
    @Param('id') id: string,
    @Body() updateRiceCharityDto: UpdateRiceCharityDto,
  ) {
    const charity = await this.riceCharityService.update(
      id,
      updateRiceCharityDto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Rice charity updated successfully',
      data: charity,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('rice_charities.delete')
  async remove(@Param('id') id: string) {
    const charity = await this.riceCharityService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Rice charity deleted successfully',
      data: charity,
    };
  }
}
