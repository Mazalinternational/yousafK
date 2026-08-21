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
import { CreateCreditRepaymentDto } from './dto/create-credit-repayment.dto.js';
import { CreateSalaryPaymentDto } from './dto/create-salary-payment.dto.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { FindEmployeesQueryDto } from './dto/find-employees-query.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { UpdateSalaryLedgerEntryDto } from './dto/update-salary-ledger-entry.dto.js';
import { EmployeeLedgerService } from './employee-ledger.service.js';
import { EmployeeService } from './employee.service.js';

@Controller('employees')
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly employeeLedgerService: EmployeeLedgerService,
  ) {}

  @Post()
  @RequirePermissions('employees.create')
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    const employee = await this.employeeService.create(createEmployeeDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Employee created successfully',
      data: employee,
    };
  }

  @Get()
  @RequirePermissions('employees.read')
  async findAll(@Query() query: FindEmployeesQueryDto) {
    const employees = await this.employeeService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Employees retrieved successfully',
      data: employees,
    };
  }

  @Get('dashboard')
  @RequirePermissions('employees.read')
  async getDashboard(@Query('seasonId') seasonId?: string) {
    const dashboard = await this.employeeService.getDashboard(seasonId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Employees dashboard retrieved successfully',
      data: dashboard,
    };
  }

  @Get(':id')
  @RequirePermissions('employees.read')
  async findOne(@Param('id') id: string) {
    const employee = await this.employeeService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Employee retrieved successfully',
      data: employee,
    };
  }

  @Get(':id/account/salary-month-preview')
  @RequirePermissions(['employees.read', 'employee_ledgers.read'], 'any')
  async getSalaryMonthPreview(
    @Param('id') id: string,
    @Query('salaryMonth') salaryMonth: string,
  ) {
    const preview = await this.employeeLedgerService.getSalaryMonthPreview(
      id,
      salaryMonth,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Salary month preview retrieved successfully',
      data: preview,
    };
  }

  @Get(':id/account')
  @RequirePermissions(['employees.read', 'employee_ledgers.read'], 'any')
  async getAccount(@Param('id') id: string) {
    const account = await this.employeeLedgerService.getEmployeeAccount(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Employee account retrieved successfully',
      data: account,
    };
  }

  @Post(':id/account/salary-payments')
  @RequirePermissions(
    ['employees.update', 'employee_ledgers.add_payment'],
    'any',
  )
  async addSalaryPayment(
    @Param('id') id: string,
    @Body() createSalaryPaymentDto: CreateSalaryPaymentDto,
  ) {
    const payment = await this.employeeLedgerService.addSalaryPayment(
      id,
      createSalaryPaymentDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Salary payment added successfully',
      data: payment,
    };
  }

  @Post(':id/account/salary-deductions')
  @RequirePermissions(
    ['employees.update', 'employee_ledgers.add_deduction'],
    'any',
  )
  async addSalaryDeduction(
    @Param('id') id: string,
    @Body() createSalaryPaymentDto: CreateSalaryPaymentDto,
  ) {
    const deduction = await this.employeeLedgerService.addSalaryDeduction(
      id,
      createSalaryPaymentDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Salary deduction added successfully',
      data: deduction,
    };
  }

  @Post(':id/account/credit-repayments')
  @RequirePermissions(
    ['employees.update', 'employee_ledgers.add_payment'],
    'any',
  )
  async addCreditRepayment(
    @Param('id') id: string,
    @Body() createCreditRepaymentDto: CreateCreditRepaymentDto,
  ) {
    const repayment = await this.employeeLedgerService.addCreditRepayment(
      id,
      createCreditRepaymentDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Employee credit repayment recorded successfully',
      data: repayment,
    };
  }

  @Patch(':id/account/entries/:entryId')
  @RequirePermissions(['employees.update', 'employee_ledgers.update'], 'any')
  async updateLedgerEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() updateSalaryLedgerEntryDto: UpdateSalaryLedgerEntryDto,
  ) {
    const entry = await this.employeeLedgerService.updateLedgerEntry(
      id,
      entryId,
      updateSalaryLedgerEntryDto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Salary ledger entry updated successfully',
      data: entry,
    };
  }

  @Delete(':id/account/entries/:entryId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(['employees.update', 'employee_ledgers.delete'], 'any')
  async deleteLedgerEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
  ) {
    const result = await this.employeeLedgerService.deleteLedgerEntry(
      id,
      entryId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Salary ledger entry deleted successfully',
      data: result,
    };
  }

  @Patch(':id')
  @RequirePermissions('employees.update')
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const employee = await this.employeeService.update(id, updateEmployeeDto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Employee updated successfully',
      data: employee,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('employees.delete')
  async remove(@Param('id') id: string) {
    const employee = await this.employeeService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Employee deleted successfully',
      data: employee,
    };
  }
}
