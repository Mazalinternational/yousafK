import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SellStoreEntryDto {
  @IsNotEmpty()
  soldWeight: string | number;

  @IsNotEmpty()
  saleAmount: string | number;

  @IsOptional()
  @IsIn(['cash', 'saraf'])
  paymentChannel?: 'cash' | 'saraf';

  @IsOptional()
  @IsString()
  sarafId?: string | null;

  @IsOptional()
  @IsString()
  sarafLedgerCurrencyId?: string | null;
}
