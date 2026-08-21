import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL,
  }),
});

const currency = await prisma.currency.findFirst({
  where: { isActive: true },
  select: { id: true },
});
const season = await prisma.season.findFirst({
  where: { status: 'ACTIVE' },
  select: { id: true, name: true },
});

if (!currency || !season) {
  throw new Error('Need active currency and season');
}

try {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "cash_transactions" (
        "id",
        "currency_id",
        "direction",
        "amount",
        "occurred_at",
        "notes",
        "season_id",
        "season_name",
        "employee_ledger_entry_id",
        "created_at",
        "updated_at"
      ) VALUES (
        ${randomUUID()},
        ${currency.id},
        ${'out'}::"cash_transaction_direction",
        ${new Prisma.Decimal('1.00')},
        ${new Date('2026-06-14')},
        ${'test'},
        ${season.id},
        ${season.name},
        ${null},
        NOW(),
        NOW()
      )
    `);
    throw new Error('rollback');
  });
} catch (error) {
  if (error instanceof Error && error.message === 'rollback') {
    console.log('cash insert SQL: OK (rolled back)');
  } else {
    console.error('cash insert SQL failed');
    console.error(error);
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
