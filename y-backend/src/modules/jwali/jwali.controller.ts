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
import { CreateJwaliLedgerEntryDto } from './dto/create-jwali-ledger-entry.dto.js';
import { CreateJwaliPaymentDto } from './dto/create-jwali-payment.dto.js';
import { CreateJwaliDto } from './dto/create-jwali.dto.js';
import { FindJwaliQueryDto } from './dto/find-jwali-query.dto.js';
import { UpdateJwaliDto } from './dto/update-jwali.dto.js';
import { UpdateJwaliLedgerEntryDto } from './dto/update-jwali-ledger-entry.dto.js';
import { UpdateJwaliPaymentDto } from './dto/update-jwali-payment.dto.js';
import { JwaliLedgerService } from './jwali-ledger.service.js';
import { JwaliService } from './jwali.service.js';

@Controller('jwali')
export class JwaliController {
  constructor(
    private readonly jwaliService: JwaliService,
    private readonly jwaliLedgerService: JwaliLedgerService,
  ) {}

  @Post()
  @RequirePermissions('jwali.create')
  async create(@Body() createJwaliDto: CreateJwaliDto) {
    const jwali = await this.jwaliService.create(createJwaliDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Jwali created successfully',
      data: jwali,
    };
  }

  @Get()
  @RequirePermissions('jwali.read')
  async findAll(@Query() query: FindJwaliQueryDto) {
    const jwalis = await this.jwaliService.findAll(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Jwali records retrieved successfully',
      data: jwalis,
    };
  }

  @Get('payments/cash-summary')
  @RequirePermissions('jwali.read')
  async getCashPaymentsSummary(@Query('seasonId') seasonId?: string) {
    const summary =
      await this.jwaliLedgerService.getCashPaymentsSummary(seasonId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Jwali cash payments summary retrieved successfully',
      data: summary,
    };
  }

  @Get(':id')
  @RequirePermissions('jwali.read')
  async findOne(@Param('id') id: string) {
    const jwali = await this.jwaliService.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Jwali record retrieved successfully',
      data: jwali,
    };
  }

  @Get(':id/account')
  @RequirePermissions(['jwali.read', 'jwali_ledgers.read'], 'any')
  async getAccount(@Param('id') id: string) {
    const account = await this.jwaliLedgerService.getJwaliAccount(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Jwali account retrieved successfully',
      data: account,
    };
  }

  @Post(':id/account/entries')
  @RequirePermissions(['jwali.update', 'jwali_ledgers.add_entry'], 'any')
  async addLedgerEntry(
    @Param('id') id: string,
    @Body() createJwaliLedgerEntryDto: CreateJwaliLedgerEntryDto,
  ) {
    const entry = await this.jwaliLedgerService.addLedgerEntry(
      id,
      createJwaliLedgerEntryDto,
    );
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Jwali ledger entry added successfully',
      data: entry,
    };
  }

  @Patch(':id/account/entries/:entryId')
  @RequirePermissions(['jwali.update', 'jwali_ledgers.update'], 'any')
  async updateLedgerEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateJwaliLedgerEntryDto,
  ) {
    const entry = await this.jwaliLedgerService.updateLedgerEntry(
      id,
      entryId,
      dto,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Jwali ledger entry updated successfully',
      data: entry,
    };
  }

  @Delete(':id/account/entries/:entryId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(['jwali.update', 'jwali_ledgers.delete'], 'any')
  async removeLedgerEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
  ) {
    const entry = await this.jwaliLedgerService.removeLedgerEntry(id, entryId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Jwali ledger entry deleted successfully',
      data: entry,
    };
  }

  @Post(':id/account/payments')
  @RequirePermissions(['jwali.update', 'jwali_ledgers.add_entry'], 'any')
  async addPayment(
    @Param('id') id: string,
    @Body() createJwaliPaymentDto: CreateJwaliPaymentDto,
  ) {
    const payment = await this.jwaliLedgerService.addPayment(
      id,
      createJwaliPaymentDto,
    );
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Jwali payment recorded successfully',
      data: payment,
    };
  }

  @Patch(':id/account/payments/:paymentId')
  @RequirePermissions(['jwali.update', 'jwali_ledgers.update'], 'any')
  async updatePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdateJwaliPaymentDto,
  ) {
    const payment = await this.jwaliLedgerService.updatePayment(
      id,
      paymentId,
      dto,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Jwali payment updated successfully',
      data: payment,
    };
  }

  @Delete(':id/account/payments/:paymentId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(['jwali.update', 'jwali_ledgers.delete'], 'any')
  async removePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
  ) {
    const payment = await this.jwaliLedgerService.removePayment(id, paymentId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Jwali payment deleted successfully',
      data: payment,
    };
  }

  @Patch(':id')
  @RequirePermissions('jwali.update')
  async update(
    @Param('id') id: string,
    @Body() updateJwaliDto: UpdateJwaliDto,
  ) {
    const jwali = await this.jwaliService.update(id, updateJwaliDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Jwali updated successfully',
      data: jwali,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('jwali.delete')
  async remove(@Param('id') id: string) {
    const jwali = await this.jwaliService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Jwali deleted successfully',
      data: jwali,
    };
  }
}
