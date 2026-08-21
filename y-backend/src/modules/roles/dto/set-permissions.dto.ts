import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class SetPermissionsDto {
  /** Permission keys (e.g. ["jwali.read", "jwali.create"]). Replaces the full set. */
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions!: string[];
}
