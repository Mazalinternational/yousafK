import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

function makePrismaClient(): PrismaClient {
  const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/**
 * Seed is intentionally self-contained (no imports from `src/`) so it runs
 * cleanly under ts-node without any module-resolution surprises. The lists
 * here MUST stay in sync with `src/common/rbac/{modules,actions}.const.ts`.
 *
 * Idempotent: re-run anytime you add a new module to APP_MODULES.
 */
const APP_MODULES = [
  'users',
  'roles',
  'permissions',
  'audit',
  'sessions',
  'seasons',
  'customers',
  'employees',
  'investors',
  'expenses',
  'expense_categories',
  'entering_paddy',
  'paddy_warehouses',
  'rice_warehouses',
  'rice_sales',
  'rice_charities',
  'paddy_processes',
  'process_rice',
  'jwali',
  'sarafi',
  'customer_ledgers',
  'employee_ledgers',
  'jwali_ledgers',
  'sarafi_ledgers',
  'stores',
  'currencies',
  'cash',
  'reports',
  'varieties',
] as const;

const APP_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'manage',
  'approve',
  'export',
  'import',
  'assign',
  'view',
  'print',
  'download',
  'share',
  'add_payment',
  'add_deduction',
  'add_entry',
] as const;

/** Must stay in sync with `src/common/rbac/customer-types.const.ts`. */
const CUSTOMER_TYPE_SLUGS = [
  'paddy_farmer',
  'paddy_seller',
  'rice_seller',
  'buyer',
  'vendor',
  'debtor',
] as const;

const CUSTOMER_TYPE_PERMISSIONS = CUSTOMER_TYPE_SLUGS.map((typeSlug) => {
  const action = `type_${typeSlug}`;
  return {
    key: `customers.${action}`,
    module: 'customers',
    action,
    description: `Allows access to ${typeSlug.replace(/_/g, ' ')} customer records`,
  };
});

const SYSTEM_ROLES = { ADMIN: 'admin', MANAGER: 'manager', STAFF: 'staff' } as const;

const ALL_PERMISSIONS = [
  ...APP_MODULES.flatMap((mod) =>
    APP_ACTIONS.map((action) => ({
      key: `${mod}.${action}`,
      module: mod,
      action,
      description: `Allows ${action} on ${mod.replace(/_/g, ' ')}`,
    })),
  ),
  ...CUSTOMER_TYPE_PERMISSIONS,
];

async function syncRolePermissions(
  prisma: PrismaClient,
  roleId: string,
  keys: string[],
) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { permissionsCustomizedAt: true },
  });
  if (!role || role.permissionsCustomizedAt) {
    return;
  }

  const perms = await prisma.permission.findMany({
    where: { key: { in: keys } },
    select: { id: true },
  });
  const desired = new Set(perms.map((p) => p.id));
  const existing = await prisma.rolePermission.findMany({ where: { roleId } });
  const existingIds = new Set(existing.map((rp) => rp.permissionId));

  const toAdd = [...desired].filter((id) => !existingIds.has(id));

  if (toAdd.length) {
    await prisma.rolePermission.createMany({
      data: toAdd.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    });
  }
  // Additive only, and skipped entirely once an admin customizes the role.
}

async function main() {
  const prisma = makePrismaClient();
  try {
    console.log(
      `[seed] permissions: ${APP_MODULES.length} modules x ${APP_ACTIONS.length} actions + ${CUSTOMER_TYPE_PERMISSIONS.length} customer types = ${ALL_PERMISSIONS.length}`,
    );

    // --- Permissions -----------------------------------------------------------
    for (const p of ALL_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key: p.key },
        update: { description: p.description },
        create: { key: p.key, module: p.module, action: p.action, description: p.description },
      });
    }

    // --- System roles ---------------------------------------------------------
    const adminRole = await prisma.role.upsert({
      where: { slug: SYSTEM_ROLES.ADMIN },
      update: { isSystem: true, name: 'Administrator' },
      create: {
        slug: SYSTEM_ROLES.ADMIN,
        name: 'Administrator',
        description: 'Full access to every module and action.',
        isSystem: true,
      },
    });

    const managerRole = await prisma.role.upsert({
      where: { slug: SYSTEM_ROLES.MANAGER },
      update: { isSystem: true, name: 'Manager' },
      create: {
        slug: SYSTEM_ROLES.MANAGER,
        name: 'Manager',
        description: 'Read + write on operations modules; cannot manage users/roles.',
        isSystem: true,
      },
    });

    const staffRole = await prisma.role.upsert({
      where: { slug: SYSTEM_ROLES.STAFF },
      update: { isSystem: true, name: 'Staff' },
      create: {
        slug: SYSTEM_ROLES.STAFF,
        name: 'Staff',
        description: 'Read-only access to operations modules.',
        isSystem: true,
      },
    });

    // --- Manager / Staff role permissions ------------------------------------
    const operationsModules = APP_MODULES.filter(
      (m) => !['users', 'roles', 'permissions', 'audit', 'sessions'].includes(m),
    );
    const customerTypePermKeys = CUSTOMER_TYPE_SLUGS.map(
      (type) => `customers.type_${type}`,
    );

    const managerPermKeys = [
      ...operationsModules.flatMap((m) => [
        `${m}.read`,
        `${m}.view`,
        `${m}.create`,
        `${m}.update`,
        `${m}.delete`,
        `${m}.export`,
      ]),
      ...customerTypePermKeys,
    ];
    await syncRolePermissions(prisma, managerRole.id, managerPermKeys);

    const staffPermKeys = [
      ...operationsModules.flatMap((m) => [`${m}.read`, `${m}.view`]),
      ...customerTypePermKeys,
    ];
    await syncRolePermissions(prisma, staffRole.id, staffPermKeys);
    // NOTE: We don't insert RolePermission rows for the admin role — the
    // PermissionsGuard short-circuits on isAdmin: true.

    // --- Default admin user ---------------------------------------------------
    const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').trim();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
    const emailNormalized = adminEmail.toLowerCase();

    const existingAdmin = await prisma.user.findFirst({ where: { emailNormalized } });
    let adminUserId: string;
    if (!existingAdmin) {
      const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });
      const created = await prisma.user.create({
        data: {
          email: adminEmail,
          emailNormalized,
          name: process.env.SEED_ADMIN_NAME || 'System Administrator',
          passwordHash,
          isActive: true,
          passwordChangedAt: new Date(),
        },
      });
      adminUserId = created.id;
      console.log(`[seed] created admin user: ${adminEmail} (password: ${adminPassword})`);
    } else {
      adminUserId = existingAdmin.id;
      console.log(`[seed] admin user already exists: ${adminEmail}`);
    }

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUserId, roleId: adminRole.id } },
      update: {},
      create: { userId: adminUserId, roleId: adminRole.id },
    });

    console.log('[seed] done.');
    await prisma.$disconnect();
  } catch (err) {
    await prisma.$disconnect().catch(() => undefined);
    throw err;
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  });
