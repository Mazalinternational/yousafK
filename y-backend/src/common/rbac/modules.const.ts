/**
 * Canonical list of authorization modules.
 *
 * Adding a new feature module to the application?
 *   1. Add its slug here (snake_case, plural noun).
 *   2. Re-run `npm run prisma:seed` (or restart the backend in dev) so the
 *      Permission rows for (module, action) get inserted automatically.
 *   3. Decorate controllers with `@RequirePermissions('<module>.<action>')`.
 *
 * The "admin" role bypasses these checks entirely (wildcard short-circuit).
 */
export const APP_MODULES = [
  // System modules
  'users',
  'roles',
  'permissions',
  'audit',
  'sessions',

  // Domain modules (mapped 1:1 to current REST controllers)
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

export type AppModule = (typeof APP_MODULES)[number];
