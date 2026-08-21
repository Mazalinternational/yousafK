import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SeasonService } from '../season/season.service.js';
import { CreateJwaliDto } from './dto/create-jwali.dto.js';
import { FindJwaliQueryDto } from './dto/find-jwali-query.dto.js';
import { UpdateJwaliDto } from './dto/update-jwali.dto.js';

@Injectable()
export class JwaliService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
  ) {}

  async create(createJwaliDto: CreateJwaliDto) {
    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);

    const name = this.requireText(createJwaliDto.name, 'name');
    const phoneNo = this.requireText(createJwaliDto.phoneNo, 'phoneNo');
    const address = this.requireText(createJwaliDto.address, 'address');
    const notes = this.normalizeOptionalText(createJwaliDto.notes);

    const created = await this.prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO "jwalis" (
          "name",
          "phone_no",
          "address",
          "notes",
          "season_id",
          "season_name",
          "updated_at"
        )
        VALUES (
          ${name},
          ${phoneNo},
          ${address},
          ${notes},
          ${activeSeason.id},
          ${activeSeason.name},
          NOW()
        )
        RETURNING "id"
      `);

      const jwaliId = inserted[0].id;

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "jwali_ledgers" ("jwali_id", "updated_at")
        VALUES (${jwaliId}, NOW())
      `);

      return String(jwaliId);
    });

    return this.findOne(created);
  }

  async findAll(filters: FindJwaliQueryDto = {}) {
    const pageNumber =
      Number(filters.pageNumber) > 0 ? Number(filters.pageNumber) : 1;
    const pageSize =
      Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 10;
    const query = filters.query?.trim();
    const sortDirection =
      filters.sortByAction || filters.sortDirection || 'desc';
    const allowedSortFields = [
      'name',
      'phoneNo',
      'seasonName',
      'createdAt',
      'updatedAt',
    ] as const;
    const sortBy = allowedSortFields.includes(
      filters.sortBy as (typeof allowedSortFields)[number],
    )
      ? (filters.sortBy as (typeof allowedSortFields)[number])
      : 'createdAt';

    const conditions: Prisma.Sql[] = [Prisma.sql`1 = 1`];

    if (filters.seasonId) {
      conditions.push(Prisma.sql`j."season_id" = ${filters.seasonId}`);
    }

    if (query) {
      const likeValue = `%${query}%`;
      conditions.push(Prisma.sql`
        (
          j."name" ILIKE ${likeValue}
          OR j."phone_no" ILIKE ${likeValue}
          OR j."address" ILIKE ${likeValue}
          OR COALESCE(j."notes", '') ILIKE ${likeValue}
          OR j."season_name" ILIKE ${likeValue}
        )
      `);
    }

    const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
    const orderByMap: Record<(typeof allowedSortFields)[number], string> = {
      name: 'j."name"',
      phoneNo: 'j."phone_no"',
      seasonName: 'j."season_name"',
      createdAt: 'j."created_at"',
      updatedAt: 'j."updated_at"',
    };
    const orderBySql = Prisma.raw(orderByMap[sortBy]);
    const orderDirectionSql = Prisma.raw(
      sortDirection === 'asc' ? ' ASC' : ' DESC',
    );

    const items = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        j."id"::text AS "id",
        j."name" AS "name",
        j."phone_no" AS "phoneNo",
        j."address" AS "address",
        j."notes" AS "notes",
        j."season_id" AS "seasonId",
        j."season_name" AS "seasonName",
        j."created_at" AS "createdAt",
        j."updated_at" AS "updatedAt",
        s."id" AS "seasonRefId",
        s."name" AS "seasonRefName",
        s."status"::text AS "seasonRefStatus"
      FROM "jwalis" j
      INNER JOIN "seasons" s ON s."id" = j."season_id"
      ${whereSql}
      ORDER BY ${orderBySql}${orderDirectionSql}
      LIMIT ${pageSize}
      OFFSET ${(pageNumber - 1) * pageSize}
    `);

    const totalRows = await this.prisma.$queryRaw<
      Array<{ count: bigint }>
    >(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM "jwalis" j
      ${whereSql}
    `);
    const totalCount = Number(totalRows[0]?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items: items.map((item) => this.serializeRow(item)),
      totalCount,
      pageNumber,
      pageSize,
      totalPages,
      hasPreviousPage: pageNumber > 1,
      hasNextPage: pageNumber < totalPages,
      isFirstPage: pageNumber === 1,
      isLastPage: pageNumber >= totalPages,
      firstPageNumber: 1,
      lastPageNumber: totalPages,
    };
  }

  async findOne(id: string) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        j."id"::text AS "id",
        j."name" AS "name",
        j."phone_no" AS "phoneNo",
        j."address" AS "address",
        j."notes" AS "notes",
        j."season_id" AS "seasonId",
        j."season_name" AS "seasonName",
        j."created_at" AS "createdAt",
        j."updated_at" AS "updatedAt",
        s."id" AS "seasonRefId",
        s."name" AS "seasonRefName",
        s."status"::text AS "seasonRefStatus"
      FROM "jwalis" j
      INNER JOIN "seasons" s ON s."id" = j."season_id"
      WHERE j."id" = ${this.parseId(id)}
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException(`Jwali with id "${id}" not found`);
    }

    return this.serializeRow(rows[0]);
  }

  async update(id: string, updateJwaliDto: UpdateJwaliDto) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const name =
      updateJwaliDto.name !== undefined
        ? this.requireText(updateJwaliDto.name, 'name')
        : current.name;
    const phoneNo =
      updateJwaliDto.phoneNo !== undefined
        ? this.requireText(updateJwaliDto.phoneNo, 'phoneNo')
        : current.phoneNo;
    const address =
      updateJwaliDto.address !== undefined
        ? this.requireText(updateJwaliDto.address, 'address')
        : current.address;
    const notes =
      updateJwaliDto.notes !== undefined
        ? this.normalizeOptionalText(updateJwaliDto.notes)
        : current.notes;

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "jwalis"
      SET
        "name" = ${name},
        "phone_no" = ${phoneNo},
        "address" = ${address},
        "notes" = ${notes},
        "updated_at" = NOW()
      WHERE "id" = ${this.parseId(id)}
    `);

    return this.findOne(id);
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM "jwalis"
      WHERE "id" = ${this.parseId(id)}
    `);

    return current;
  }

  private serializeRow(row: any) {
    return {
      id: String(row.id),
      name: row.name,
      phoneNo: row.phoneNo,
      address: row.address,
      notes: row.notes,
      seasonId: row.seasonId,
      seasonName: row.seasonName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      season: row.seasonRefId
        ? {
            id: row.seasonRefId,
            name: row.seasonRefName,
            status: row.seasonRefStatus,
          }
        : null,
    };
  }

  private parseId(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('id must be a valid bigint');
    }
  }

  private requireText(value: string, fieldName: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    return normalized;
  }

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
