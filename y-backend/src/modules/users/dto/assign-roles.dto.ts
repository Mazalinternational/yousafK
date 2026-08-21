import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class AssignRolesDto {
  /** Role slugs (e.g. ["admin", "manager"]). */
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  roles!: string[];
}
