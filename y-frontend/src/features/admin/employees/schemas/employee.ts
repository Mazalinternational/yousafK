import type { TFunction } from "i18next";
import z from "zod";

export const EMPLOYEE_STATUS_OPTIONS = ["active", "inactive"] as const;

export const EmployeeSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
});

export const EmployeeSchema = z.object({
  id: z.string(),
  employeeNo: z.string(),
  name: z.string().min(1),
  position: z.string().min(1),
  phoneNo: z.string().min(1),
  address: z.string().min(1),
  joinDate: z.string(),
  monthlySalary: z.union([z.string(), z.number()]).transform(String),
  status: z.enum(EMPLOYEE_STATUS_OPTIONS),
  notes: z.string().nullable().optional(),
  seasonId: z.string(),
  seasonName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  season: EmployeeSeasonSchema.nullable().optional(),
});

const createDecimalField = (t: TFunction) =>
  z
    .string()
    .min(1, { message: t("common:employee_validation_required") })
    .refine((value) => !Number.isNaN(Number(value)), {
      message: t("common:employee_validation_valid_number"),
    })
    .refine((value) => Number(value) > 0, {
      message: t("common:employee_validation_positive_number"),
    });

export const createEmployeeFormSchema = (t: TFunction) =>
  z.object({
    employeeNo: z.string().optional().or(z.literal("")),
    name: z.string().trim().min(1, { message: t("common:employee_validation_required") }),
    position: z.string().trim().min(1, { message: t("common:employee_validation_required") }),
    phoneNo: z.string().trim().min(1, { message: t("common:employee_validation_required") }),
    address: z.string().trim().min(1, { message: t("common:employee_validation_required") }),
    joinDate: z.string().min(1, { message: t("common:employee_validation_required") }),
    monthlySalary: createDecimalField(t),
    status: z.enum(EMPLOYEE_STATUS_OPTIONS),
    notes: z.string().optional().or(z.literal("")),
  });

export const EMPLOYEE_SALARY_PAYMENT_ROUTE = ["cash", "saraf"] as const;

export const EmployeeLedgerSarafSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const EmployeeLedgerCurrencySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
});

export const EmployeeLedgerEntrySchema = z.object({
  id: z.string(),
  entryType: z.enum(["salary_payment", "salary_deduction", "credit_repayment"]),
  amount: z.string(),
  salaryMonth: z.string(),
  occurredAt: z.string(),
  isAdvance: z.boolean().optional().default(false),
  paymentChannel: z.enum(EMPLOYEE_SALARY_PAYMENT_ROUTE).optional().default("cash"),
  sarafId: z.string().nullable().optional(),
  sarafLedgerCurrencyId: z.string().nullable().optional(),
  saraf: EmployeeLedgerSarafSchema.nullable().optional(),
  sarafLedgerCurrency: EmployeeLedgerCurrencySchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const EmployeeAccountSummarySchema = z.object({
  currentMonthlySalary: z.string(),
  currentShamsiMonthKey: z.string().optional(),
  currentShamsiMonthLabel: z.string().optional(),
  grossPayableThisMonth: z.string().optional(),
  payableThisMonth: z.string(),
  deductionsThisMonth: z.string(),
  /** Accrued salary (after deductions) from hire Shamsi month through today. */
  totalPayableFromHire: z.string().optional(),
  /** Outstanding salary still owed for hire → now after payments. */
  remainingFromHire: z.string().optional(),
  deductionsFromHire: z.string().optional(),
  paidFromHire: z.string().optional(),
  totalPaidAmount: z.string(),
  paidThisMonth: z.string(),
  remainingThisMonth: z.string(),
  weOweEmployeeThisMonth: z.string(),
  employeeCreditBalance: z.string(),
  totalCreditRepaid: z.string().optional(),
  paymentStatus: z.enum(["paid", "partial_paid", "remaining"]),
  paymentCount: z.number(),
  lastPaymentDate: z.string().nullable().optional(),
});

export const EmployeeAccountSchema = z.object({
  employee: EmployeeSchema,
  ledger: z.object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    summary: EmployeeAccountSummarySchema,
    entries: z.array(EmployeeLedgerEntrySchema),
  }),
});

export const SalaryMonthPreviewSchema = z.object({
  salaryMonth: z.string(),
  shamsiMonthKey: z.string(),
  shamsiMonthLabel: z.string(),
  monthlySalary: z.string(),
  payableAmount: z.string(),
  paidAmount: z.string(),
  deductionsAmount: z.string(),
  remainingAmount: z.string(),
  payableDays: z.number(),
  daysInMonth: z.number(),
  isHireMonth: z.boolean(),
  isPartialMonth: z.boolean().optional().default(false),
  isFutureMonth: z.boolean(),
  isPrepaid: z.boolean().optional().default(false),
});

export const createSalaryLedgerFormSchema = (t: TFunction) =>
  z.object({
    monthlySalaryPreview: z.string().optional().or(z.literal("")),
    amount: z.string().trim().min(1, { message: t("common:employee_validation_required") }),
    paymentDate: z.string().min(1, { message: t("common:employee_validation_required") }),
    salaryMonth: z.string().min(1, { message: t("common:employee_validation_required") }),
    paymentChannel: z.enum(EMPLOYEE_SALARY_PAYMENT_ROUTE).optional().default("cash"),
    sarafId: z.string().optional().or(z.literal("")),
    sarafLedgerCurrencyId: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  });

export const createSalaryDeductionFormSchema = (t: TFunction) =>
  createSalaryLedgerFormSchema(t).pick({
    monthlySalaryPreview: true,
    amount: true,
    paymentDate: true,
    salaryMonth: true,
    notes: true,
  });

export const createSalaryPaymentFormSchema = (t: TFunction) =>
  createSalaryLedgerFormSchema(t)
    .required({
      paymentChannel: true,
    })
    .refine((values) => Boolean(values.sarafLedgerCurrencyId?.trim()), {
      message: t("common:employee_validation_currency_required"),
      path: ["sarafLedgerCurrencyId"],
    })
    .refine(
      (values) => {
        if (values.paymentChannel !== "saraf") {
          return true;
        }
        return Boolean(values.sarafId?.trim());
      },
      {
        message: t("common:employee_validation_saraf_required"),
        path: ["sarafId"],
      },
    );

export const createCreditRepaymentFormSchema = (t: TFunction) =>
  z
    .object({
      creditBalancePreview: z.string().optional().or(z.literal("")),
      amount: z.string().trim().min(1, { message: t("common:employee_validation_required") }),
      paymentDate: z.string().min(1, { message: t("common:employee_validation_required") }),
      paymentChannel: z.enum(EMPLOYEE_SALARY_PAYMENT_ROUTE),
      sarafId: z.string().optional().or(z.literal("")),
      sarafLedgerCurrencyId: z.string().optional().or(z.literal("")),
      notes: z.string().optional().or(z.literal("")),
    })
    .refine((values) => Boolean(values.sarafLedgerCurrencyId?.trim()), {
      message: t("common:employee_validation_currency_required"),
      path: ["sarafLedgerCurrencyId"],
    })
    .refine(
      (values) => {
        if (values.paymentChannel !== "saraf") {
          return true;
        }
        return Boolean(values.sarafId?.trim());
      },
      {
        message: t("common:employee_validation_saraf_required"),
        path: ["sarafId"],
      },
    );

export type Employee = z.infer<typeof EmployeeSchema>;
export type EmployeeFormValues = z.infer<ReturnType<typeof createEmployeeFormSchema>>;
export type EmployeeLedgerEntry = z.infer<typeof EmployeeLedgerEntrySchema>;
export type EmployeeAccount = z.infer<typeof EmployeeAccountSchema>;
export type SalaryMonthPreview = z.infer<typeof SalaryMonthPreviewSchema>;
export type SalaryLedgerFormValues = z.infer<ReturnType<typeof createSalaryLedgerFormSchema>>;
export type SalaryDeductionFormValues = z.infer<ReturnType<typeof createSalaryDeductionFormSchema>>;
export type SalaryPaymentFormValues = z.infer<ReturnType<typeof createSalaryPaymentFormSchema>>;
export type CreditRepaymentFormValues = z.infer<ReturnType<typeof createCreditRepaymentFormSchema>>;
