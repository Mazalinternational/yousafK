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
import { CreateSarafLedgerEntryDto } from './dto/create-saraf-ledger-entry.dto.js';
import { CreateSarafDto } from './dto/create-saraf.dto.js';
import { FindSarafsQueryDto } from './dto/find-sarafs-query.dto.js';
import { UpdateSarafDto } from './dto/update-saraf.dto.js';
import { SarafLedgerService } from './saraf-ledger.service.js';
import { SarafService } from './saraf.service.js';

@Controller('sarafi')
export class SarafiController {
  constructor(
    private readonly sarafService: SarafService,
    private readonly sarafLedgerService: SarafLedgerService,
  ) {}

  @Post()
  @RequirePermissions('sarafi.create')
  async create(@Body() createDto: CreateSarafDto) {
    const saraf = await this.sarafService.create(createDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Saraf created successfully',
      data: saraf,
    };
  }

  @Get()
  @RequirePermissions(['sarafi.read', 'sarafi_ledgers.read'], 'any')
  async findAll(@Query() query: FindSarafsQueryDto) {
    const result = await this.sarafService.findAll(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Saraf records retrieved successfully',
      data: result,
    };
  }

  @Get('cash-summary')
  @RequirePermissions(['sarafi.read', 'sarafi_ledgers.read'], 'any')
  async getCashSummary(@Query('seasonId') seasonId?: string) {
    const summary =
      await this.sarafLedgerService.getSeasonCashSummary(seasonId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Saraf cash summary retrieved successfully',
      data: summary,
    };
  }

  @Get(':id')
  @RequirePermissions('sarafi.read')
  async findOne(@Param('id') id: string) {
    const saraf = await this.sarafService.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Saraf retrieved successfully',
      data: saraf,
    };
  }

  @Get(':id/account')
  @RequirePermissions(['sarafi.read', 'sarafi_ledgers.read'], 'any')
  async getAccount(@Param('id') id: string) {
    const account = await this.sarafLedgerService.getSarafAccount(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Saraf account retrieved successfully',
      data: account,
    };
  }

  @Post(':id/account/entries')
  @RequirePermissions(['sarafi.update', 'sarafi_ledgers.add_entry'], 'any')
  async addLedgerEntry(
    @Param('id') id: string,
    @Body() dto: CreateSarafLedgerEntryDto,
  ) {
    const entry = await this.sarafLedgerService.addLedgerEntry(id, dto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Cash ledger entry added successfully',
      data: entry,
    };
  }

  @Patch(':id')
  @RequirePermissions('sarafi.update')
  async update(@Param('id') id: string, @Body() updateDto: UpdateSarafDto) {
    const saraf = await this.sarafService.update(id, updateDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Saraf updated successfully',
      data: saraf,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('sarafi.delete')
  async remove(@Param('id') id: string) {
    const saraf = await this.sarafService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Saraf deleted successfully',
      data: saraf,
    };
  }
}
