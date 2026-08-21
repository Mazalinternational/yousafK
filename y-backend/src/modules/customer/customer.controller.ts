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
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/auth/decorators/permissions.decorator.js';
import type { AuthenticatedUser } from '../../common/auth/auth-types.js';
import { CustomerLedgerService } from './customer-ledger.service.js';
import { CreateBuyerBalanceAdjustmentDto } from './dto/create-buyer-balance-adjustment.dto.js';
import { CreateBuyerPaymentDto } from './dto/create-buyer-payment.dto.js';
import { CreateSellerBalanceAdjustmentDto } from './dto/create-seller-balance-adjustment.dto.js';
import { CreateSellerBalanceTransferDto } from './dto/create-seller-balance-transfer.dto.js';
import { CreateCompanyPaymentDto } from './dto/create-company-payment.dto.js';
import { CustomerService } from './customer.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { CreateFarmerRiceReturnDto } from './dto/create-farmer-rice-return.dto.js';
import { FindCustomersQueryDto } from './dto/find-customers-query.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { UpdateLedgerEntryDto } from './dto/update-ledger-entry.dto.js';

@Controller('customers')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly customerLedgerService: CustomerLedgerService,
  ) {}

  @Post()
  @RequirePermissions('customers.create')
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const customer = await this.customerService.create(createCustomerDto, user);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Customer created successfully',
      data: customer,
    };
  }

  @Get()
  @RequirePermissions('customers.read')
  async findAll(
    @Query() query: FindCustomersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const customers = await this.customerService.findAll(query, user);

    return {
      statusCode: HttpStatus.OK,
      message: 'Customers retrieved successfully',
      data: customers,
    };
  }

  @Get('buyer-transfers-summary')
  @RequirePermissions(['customers.read', 'customer_ledgers.read'], 'any')
  async getBuyerTransfersSummary(
    @Query('seasonId') seasonId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Summary is buyer-only; require buyer type access.
    this.customerService.assertUserCanAccessCustomerTypeOnly(user, 'buyer');

    const summary =
      await this.customerLedgerService.getBuyerTransfersSummary(seasonId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Buyer transfers summary retrieved successfully',
      data: summary,
    };
  }

  @Get(':id')
  @RequirePermissions('customers.read')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const customer = await this.customerService.findOne(id, user);

    return {
      statusCode: HttpStatus.OK,
      message: 'Customer retrieved successfully',
      data: customer,
    };
  }

  @Get(':id/account')
  @RequirePermissions(['customers.read', 'customer_ledgers.read'], 'any')
  async getAccount(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.customerService.assertUserCanAccessCustomer(id, user);
    const account = await this.customerLedgerService.getCustomerAccount(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Customer account retrieved successfully',
      data: account,
    };
  }

  @Patch(':id')
  @RequirePermissions('customers.update')
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const customer = await this.customerService.update(
      id,
      updateCustomerDto,
      user,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Customer updated successfully',
      data: customer,
    };
  }

  @Post(':id/account/company-payments')
  @RequirePermissions(
    ['customers.update', 'customer_ledgers.add_payment'],
    'any',
  )
  async addCompanyPayment(
    @Param('id') id: string,
    @Body() createCompanyPaymentDto: CreateCompanyPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.customerService.assertUserCanAccessCustomer(id, user);
    const payment = await this.customerLedgerService.addCompanyPayment(
      id,
      createCompanyPaymentDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Company payment added successfully',
      data: payment,
    };
  }

  @Post(':id/account/buyer-payments')
  @RequirePermissions(
    ['customers.update', 'customer_ledgers.add_payment'],
    'any',
  )
  async addBuyerPayment(
    @Param('id') id: string,
    @Body() createBuyerPaymentDto: CreateBuyerPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.customerService.assertUserCanAccessCustomer(id, user);
    const payment = await this.customerLedgerService.addBuyerPayment(
      id,
      createBuyerPaymentDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Customer payment added successfully',
      data: payment,
    };
  }

  @Post(':id/account/buyer-balance-adjustments')
  @RequirePermissions(
    ['customers.update', 'customer_ledgers.add_payment'],
    'any',
  )
  async addBuyerBalanceAdjustment(
    @Param('id') id: string,
    @Body() createBuyerBalanceAdjustmentDto: CreateBuyerBalanceAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.customerService.assertUserCanAccessCustomer(id, user);
    const entry = await this.customerLedgerService.addBuyerBalanceAdjustment(
      id,
      createBuyerBalanceAdjustmentDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Buyer balance adjustment added successfully',
      data: entry,
    };
  }

  @Post(':id/account/seller-balance-adjustments')
  @RequirePermissions(
    ['customers.update', 'customer_ledgers.add_payment'],
    'any',
  )
  async addSellerBalanceAdjustment(
    @Param('id') id: string,
    @Body() createSellerBalanceAdjustmentDto: CreateSellerBalanceAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.customerService.assertUserCanAccessCustomer(id, user);
    const entry = await this.customerLedgerService.addSellerBalanceAdjustment(
      id,
      createSellerBalanceAdjustmentDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Seller balance adjustment added successfully',
      data: entry,
    };
  }

  @Post(':id/account/seller-transfers')
  @RequirePermissions(
    ['customers.update', 'customer_ledgers.add_payment'],
    'any',
  )
  async addSellerBalanceTransfer(
    @Param('id') id: string,
    @Body() createSellerBalanceTransferDto: CreateSellerBalanceTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.customerService.assertUserCanAccessCustomer(id, user);
    const transfer = await this.customerLedgerService.addSellerBalanceTransfer(
      id,
      createSellerBalanceTransferDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Seller balance transferred successfully',
      data: transfer,
    };
  }

  @Post(':id/account/debtor-disbursements')
  @RequirePermissions(
    ['customers.update', 'customer_ledgers.add_payment'],
    'any',
  )
  async addDebtorDisbursement(
    @Param('id') id: string,
    @Body() createCompanyPaymentDto: CreateCompanyPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.customerService.assertUserCanAccessCustomer(id, user);
    const payment = await this.customerLedgerService.addDebtorDisbursement(
      id,
      createCompanyPaymentDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Debtor disbursement added successfully',
      data: payment,
    };
  }

  @Post(':id/account/debtor-repayments')
  @RequirePermissions(
    ['customers.update', 'customer_ledgers.add_payment'],
    'any',
  )
  async addDebtorRepayment(
    @Param('id') id: string,
    @Body() createBuyerPaymentDto: CreateBuyerPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.customerService.assertUserCanAccessCustomer(id, user);
    const payment = await this.customerLedgerService.addDebtorRepayment(
      id,
      createBuyerPaymentDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Debtor repayment added successfully',
      data: payment,
    };
  }

  @Post(':id/account/farmer-returns')
  @RequirePermissions(['customers.update', 'customer_ledgers.add_entry'], 'any')
  async addFarmerRiceReturn(
    @Param('id') id: string,
    @Body() createFarmerRiceReturnDto: CreateFarmerRiceReturnDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.customerService.assertUserCanAccessCustomer(id, user);
    const riceReturn = await this.customerLedgerService.addFarmerRiceReturn(
      id,
      createFarmerRiceReturnDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Farmer rice return added successfully',
      data: riceReturn,
    };
  }

  @Post(':id/account/farmer-returns/:entryId/fulfill')
  @RequirePermissions(['customers.update', 'customer_ledgers.add_entry'], 'any')
  async fulfillFarmerRiceReturn(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.customerService.assertUserCanAccessCustomer(id, user);
    const entry = await this.customerLedgerService.fulfillFarmerRiceReturn(
      id,
      entryId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Farmer rice return issued from stock successfully',
      data: entry,
    };
  }

  @Patch(':id/account/entries/:entryId')
  @RequirePermissions(['customers.update', 'customer_ledgers.update'], 'any')
  async updateLedgerEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() updateLedgerEntryDto: UpdateLedgerEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.customerService.assertUserCanAccessCustomer(id, user);
    const entry = await this.customerLedgerService.updateLedgerEntry(
      id,
      entryId,
      updateLedgerEntryDto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Ledger entry updated successfully',
      data: entry,
    };
  }

  @Delete(':id/account/entries/:entryId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(['customers.update', 'customer_ledgers.delete'], 'any')
  async deleteLedgerEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.customerService.assertUserCanAccessCustomer(id, user);
    const result = await this.customerLedgerService.deleteLedgerEntry(
      id,
      entryId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Ledger entry deleted successfully',
      data: result,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('customers.delete')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const customer = await this.customerService.remove(id, user);

    return {
      statusCode: HttpStatus.OK,
      message: 'Customer deleted successfully',
      data: customer,
    };
  }
}
