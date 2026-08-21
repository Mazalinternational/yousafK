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
import { CreateInvestorDto } from './dto/create-investor.dto.js';
import { FindInvestorsQueryDto } from './dto/find-investors-query.dto.js';
import { UpdateInvestorDto } from './dto/update-investor.dto.js';
import { InvestorsService } from './investors.service.js';

@Controller('investors')
export class InvestorsController {
  constructor(private readonly investorsService: InvestorsService) {}

  @Post()
  @RequirePermissions('investors.create')
  async create(@Body() createDto: CreateInvestorDto) {
    const investor = await this.investorsService.create(createDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Investor created successfully',
      data: investor,
    };
  }

  @Get()
  @RequirePermissions('investors.read')
  async findAll(@Query() query: FindInvestorsQueryDto) {
    const result = await this.investorsService.findAll(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Investors retrieved successfully',
      data: result,
    };
  }

  @Get('dashboard')
  @RequirePermissions('investors.read')
  async getDashboard(@Query('seasonId') seasonId?: string) {
    const dashboard = await this.investorsService.getDashboard(seasonId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Investors dashboard retrieved successfully',
      data: dashboard,
    };
  }

  @Get(':id')
  @RequirePermissions('investors.read')
  async findOne(@Param('id') id: string) {
    const investor = await this.investorsService.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Investor retrieved successfully',
      data: investor,
    };
  }

  @Patch(':id')
  @RequirePermissions('investors.update')
  async update(@Param('id') id: string, @Body() updateDto: UpdateInvestorDto) {
    const investor = await this.investorsService.update(id, updateDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Investor updated successfully',
      data: investor,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('investors.delete')
  async remove(@Param('id') id: string) {
    const investor = await this.investorsService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Investor deleted successfully',
      data: investor,
    };
  }
}
