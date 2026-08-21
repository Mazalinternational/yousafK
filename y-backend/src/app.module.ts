import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { authConfig } from './common/auth/auth.config.js';
import { CsrfGuard } from './common/auth/guards/csrf.guard.js';
import { JwtAuthGuard } from './common/auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/auth/guards/permissions.guard.js';
import { RolesGuard } from './common/auth/guards/roles.guard.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CashModule } from './modules/cash/cash.module.js';
import { CurrencyModule } from './modules/currency/currency.module.js';
import { CustomerModule } from './modules/customer/customer.module.js';
import { EmployeeModule } from './modules/employee/employee.module.js';
import { EnteringPaddyModule } from './modules/entering/entering-paddy.module.js';
import { ExpenseCategoryModule } from './modules/expense-category/expense-category.module.js';
import { ExpensesModule } from './modules/expenses/expenses.module.js';
import { FarmerOwnedPaddyWarehouseModule } from './modules/farmer-paddy/farmer-owned-paddy-warehouse.module.js';
import { JwaliModule } from './modules/jwali/jwali.module.js';
import { InvestorsModule } from './modules/investors/investors.module.js';
import { SarafiModule } from './modules/sarafi/sarafi.module.js';
import { PaddyProcessModule } from './modules/paddy-process/paddy-process.module.js';
import { PaddyWarehouseModule } from './modules/company-paddy/paddy-warehouse.module.js';
import { PermissionsModule } from './modules/permissions/permissions.module.js';
import { ProcessRiceModule } from './modules/process-rice/process-rice.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { RiceCharityModule } from './modules/rice-charity/rice-charity.module.js';
import { RiceSaleModule } from './modules/rice-sale/rice-sale.module.js';
import { RiceWarehouseModule } from './modules/rice/rice-warehouse.module.js';
import { RolesModule } from './modules/roles/roles.module.js';
import { SeasonModule } from './modules/season/season.module.js';
import { StoreModule } from './modules/store/store.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { VarietyModule } from './modules/variety/variety.module.js';
import { HealthController } from './health.controller.js';

/**
 * Global guard ordering matters:
 *   1. ThrottlerGuard  -> reject brute-force traffic before any DB hits.
 *   2. JwtAuthGuard    -> populate req.user (skips @Public handlers).
 *   3. CsrfGuard       -> double-submit check on state-changing methods.
 *   4. RolesGuard      -> @RequireRoles(...) check.
 *   5. PermissionsGuard-> @RequirePermissions(...) check.
 *
 * Each later guard depends on req.user from the previous step.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: authConfig.throttle.ttlMs,
        limit: authConfig.throttle.limit,
      },
    ]),
    PrismaModule,
    AuthModule,
    AuditModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    SeasonModule,
    CustomerModule,
    EmployeeModule,
    ExpenseCategoryModule,
    ExpensesModule,
    EnteringPaddyModule,
    PaddyWarehouseModule,
    FarmerOwnedPaddyWarehouseModule,
    PaddyProcessModule,
    ProcessRiceModule,
    JwaliModule,
    InvestorsModule,
    SarafiModule,
    StoreModule,
    RiceWarehouseModule,
    RiceSaleModule,
    RiceCharityModule,
    CurrencyModule,
    CashModule,
    ReportsModule,
    VarietyModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
