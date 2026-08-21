import { Logger } from '@nestjs/common';
import { execSync } from 'node:child_process';

/**
 * Coolify/production must never start with a schema behind migrations.
 * Runs on every production boot (and when RUN_MIGRATIONS_ON_BOOT=true).
 */
export function runDatabaseMigrationsOnBoot(): void {
  if (process.env.SKIP_DB_MIGRATIONS === 'true') {
    return;
  }

  const shouldRun =
    process.env.NODE_ENV === 'production' ||
    process.env.RUN_MIGRATIONS_ON_BOOT === 'true';

  if (!shouldRun) {
    return;
  }

  const log = new Logger('DatabaseMigrations');
  log.log('Applying pending Prisma migrations (migrate deploy)...');

  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    });
    log.log('Database migrations are up to date.');
  } catch {
    log.error(
      'Prisma migrate deploy failed. Fix DATABASE_URL / DIRECT_DATABASE_URL and migration history, then redeploy.',
    );
    process.exit(1);
  }
}
