import type { TFunction } from "i18next";

const MODULE_SIDEBAR_KEYS: Record<string, string> = {
  users: "sidebar:admin:users",
  roles: "sidebar:admin:roles",
  permissions: "sidebar:admin:role_permissions",
  seasons: "sidebar:season:season",
  customers: "sidebar:customer:customers",
  employees: "sidebar:employees:employees",
  investors: "sidebar:investor:investors",
  expenses: "sidebar:expenses:expenses",
  expense_categories: "sidebar:expenses:categories",
  entering_paddy: "sidebar:entering_paddy:entering_paddy",
  paddy_warehouses: "sidebar:paddy_warehouse:paddy_warehouse",
  rice_warehouses: "sidebar:rice_warehouse:rice_warehouse",
  rice_sales: "sidebar:rice_warehouse:rice_sales",
  rice_charities: "sidebar:rice_warehouse:rice_charity",
  paddy_processes: "sidebar:paddy_process:paddy_process",
  process_rice: "sidebar:rice_warehouse:process_rice",
  jwali: "sidebar:jwali:jwali",
  sarafi: "sidebar:sarafi:sarafi",
  stores: "sidebar:store:store",
  currencies: "sidebar:currency:currencies",
  cash: "sidebar:cash:cash",
  reports: "sidebar:reports:reports",
  varieties: "sidebar:veriety:veriety",
};

const MODULE_COMMON_KEYS: Record<string, string> = {
  audit: "common:permission_module_audit",
  sessions: "common:permission_module_sessions",
  customer_ledgers: "common:permission_module_customer_ledgers",
  employee_ledgers: "common:permission_module_employee_ledgers",
  jwali_ledgers: "common:permission_module_jwali_ledgers",
  sarafi_ledgers: "common:permission_module_sarafi_ledgers",
};

export function getLocalizedPermissionModule(module: string, t: TFunction): string {
  const sidebarKey = MODULE_SIDEBAR_KEYS[module];
  if (sidebarKey) return t(sidebarKey);
  const commonKey = MODULE_COMMON_KEYS[module];
  if (commonKey) return t(commonKey);
  return t(`common:permission_module_${module}`, {
    defaultValue: module.replace(/_/g, " "),
  });
}

export function getLocalizedPermissionAction(action: string, t: TFunction): string {
  if (action.startsWith("type_")) {
    const customerType = action.slice("type_".length);
    return t(`common:${customerType}`, {
      defaultValue: customerType.replace(/_/g, " "),
    });
  }

  return t(`common:permission_action_${action}`, {
    defaultValue: action.replace(/_/g, " "),
  });
}
