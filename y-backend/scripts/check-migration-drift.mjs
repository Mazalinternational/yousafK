#!/usr/bin/env node
/**
 * Fails when prisma/schema.prisma is out of sync with prisma/migrations.
 * Coolify runs `prisma migrate deploy` only — schema changes without a migration
 * cause production 500s. Run this before push/deploy.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'prisma',
    'migrate',
    'diff',
    '--from-migrations',
    'prisma/migrations',
    '--to-schema',
    'prisma/schema.prisma',
    '--script',
    '--exit-code',
  ],
  {
    cwd: backendRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  },
);

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
const emptyMigration =
  output === '' ||
  output === '-- This is an empty migration.' ||
  output.includes('This is an empty migration');

if (result.status === 0 && emptyMigration) {
  console.log('Prisma migration check passed (schema matches migrations).');
  process.exit(0);
}

if (result.status === 2 && !emptyMigration) {
  console.error(
    'Prisma schema drift detected. Create a migration before deploying:\n',
  );
  console.error(output);
  console.error(
    '\nFix: npx prisma migrate dev --name describe_your_change\n' +
      'Never use `prisma db push` for changes that must reach Coolify/production.',
  );
  process.exit(1);
}

if (result.status !== 0) {
  console.error(output || 'Prisma migrate diff failed.');
  process.exit(result.status ?? 1);
}

console.log('Prisma migration check passed (schema matches migrations).');
