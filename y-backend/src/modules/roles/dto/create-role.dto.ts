import {
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9_-]+$/i, {
    message: 'slug must be lowercase letters, digits, _ or -',
  })
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Permission keys (e.g. ["users.create", "jwali.read"]). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
