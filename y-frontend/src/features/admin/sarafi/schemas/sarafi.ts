import z from "zod";

export const SarafSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
});

export const SarafSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  phoneNo: z.string().min(1),
  address: z.string().min(1),
  notes: z.string().nullable().optional(),
  seasonId: z.string(),
  seasonName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  season: SarafSeasonSchema.nullable().optional(),
});

export const SarafFormSchema = z.object({
  name: z.string().trim().min(1),
  phoneNo: z.string().trim().min(1),
  address: z.string().trim().min(1),
  notes: z.string().optional().or(z.literal("")),
});

export const SarafLedgerEntrySchema = z.object({
  id: z.string(),
  currencyId: z.string(),
  currencyCode: z.string(),
  currencyName: z.string(),
  amount: z.string(),
  occurredAt: z.string(),
  notes: z.string().nullable().optional(),
  riceSaleId: z.string().nullable().optional(),
  riceSaleBillNo: z.string().nullable().optional(),
  companyPaddyWarehouseId: z.string().nullable().optional(),
  companyPaddyWarehouseBillNo: z.string().nullable().optional(),
  employeeLedgerEntryId: z.string().nullable().optional(),
  employeeSalaryEmployeeName: z.string().nullable().optional(),
  employeeSalaryEmployeeNo: z.string().nullable().optional(),
  jwaliPaymentId: z.string().nullable().optional(),
  jwaliPaymentJwaliName: z.string().nullable().optional(),
  jwaliPaymentJwaliPhone: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SarafAccountSummaryByCurrencySchema = z.object({
  currencyId: z.string(),
  currencyCode: z.string(),
  currencyName: z.string(),
  totalAmount: z.string(),
  entryCount: z.number(),
});

export const SarafAccountSummarySchema = z.object({
  entryCount: z.number(),
  byCurrency: z.array(SarafAccountSummaryByCurrencySchema),
});

export const SarafAccountSchema = z.object({
  saraf: SarafSchema,
  ledger: z.object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    summary: SarafAccountSummarySchema,
    entries: z.array(SarafLedgerEntrySchema),
  }),
});

export const SarafLedgerEntryFormSchema = z.object({
  currencyId: z.string().trim().min(1),
  direction: z.enum(["in", "out"]),
  amount: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Number(value)), "Must be a valid number")
    .refine((value) => Number(value) > 0, "Must be greater than 0"),
  occurredAt: z.string().min(1),
  notes: z.string().optional().or(z.literal("")),
});

export type Saraf = z.infer<typeof SarafSchema>;
export type SarafFormValues = z.infer<typeof SarafFormSchema>;
export type SarafAccount = z.infer<typeof SarafAccountSchema>;
export type SarafLedgerEntryFormValues = z.infer<typeof SarafLedgerEntryFormSchema>;
export type SarafLedgerEntry = z.infer<typeof SarafLedgerEntrySchema>;
