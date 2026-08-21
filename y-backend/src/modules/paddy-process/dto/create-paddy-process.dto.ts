import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PROCESS_STORE_SOURCE_TYPES } from '../paddy-process.constants.js';

const WAREHOUSE_STOCK_SOURCE_TYPES = ['company', 'farmer'] as const;

export const PADDY_PROCESS_STOCK_SOURCE_TYPES = [
  ...WAREHOUSE_STOCK_SOURCE_TYPES,
  ...PROCESS_STORE_SOURCE_TYPES,
] as const;

export type PaddyProcessStockSourceType =
  (typeof PADDY_PROCESS_STOCK_SOURCE_TYPES)[number];

export class CreatePaddyProcessDto {
  @IsOptional()
  @IsString()
  variety?: string;

  @IsIn([...PADDY_PROCESS_STOCK_SOURCE_TYPES])
  stockSourceType: PaddyProcessStockSourceType;

  @IsNotEmpty()
  @IsString()
  date: string;

  @IsNotEmpty()
  weight: string | number;

  @IsOptional()
  @IsString()
  unit?: string;
}
