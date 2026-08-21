export class UpdateSalaryLedgerEntryDto {
  amount?: string | number;
  paymentDate?: string;
  salaryMonth?: string;
  notes?: string | null;
  paymentChannel?: string | null;
  sarafId?: string | null;
  sarafLedgerCurrencyId?: string | null;
}
