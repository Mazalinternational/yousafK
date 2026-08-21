import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateStoreEntryDto {
  @IsIn(['short_green', 'regection', 'broken_rice', 'waste'])
  storeType: 'short_green' | 'regection' | 'broken_rice' | 'waste';

  @IsString()
  @IsNotEmpty()
  sourcePaddyProcessId: string;

  @IsNotEmpty()
  weight: string | number;
}
