import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const connectionString =
      process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL or DIRECT_DATABASE_URL must be set for Prisma',
      );
    }

    super({
      adapter: new PrismaPg({ connectionString }),
    });
  }
}
