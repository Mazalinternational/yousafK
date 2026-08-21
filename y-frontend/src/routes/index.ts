import { createElement } from "react";
import { type RouteObject } from "react-router-dom";
import { SidebarLayout } from "../components/sidebar-layout";
import { MainLayout } from "@/components/main-layout";
import {
  generalDashboardRoutes,
  currencyRoutes,
  expenseCategoryRoutes,
  cashRoutes,
  employeeRoutes,
  investorRoutes,
  expenseRoutes,
  seasonRoutes,
  enteringPaddyRoutes,
  jwaliRoutes,
  sarafiRoutes,
  paddyWarehouseRoutes,
  reportRoutes,
  riceWarehouseRoutes,
  storeRoutes,
  verietiesRoutes,
} from "../features/admin/routes";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";
import { ChangePasswordPage } from "@/features/auth/pages/ChangePasswordPage";
import { ProfilePage } from "@/features/auth/pages/ProfilePage";
import { ForbiddenPage } from "@/features/auth/pages/ForbiddenPage";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { HomeRedirect } from "@/features/auth/components/HomeRedirect";
import { UsersAdminPage } from "@/features/admin/users/components/UsersAdminPage";
import { RolesAdminPage } from "@/features/admin/roles/components/RolesAdminPage";
import { RolePermissionsPage } from "@/features/admin/roles/components/RolePermissionsPage";

/**
 * Wraps an array of routes with a ProtectedRoute that requires any-of the
 * given permissions. We pass `<module>.read`, `<module>.view`, AND
 * `<module>.manage` so that holding any one of them grants access -- this
 * matches the sidebar visibility rules and the backend's `manage`
 * super-permission.
 */
function withPermission(
  permissionAnyOf: string[],
  routes: RouteObject[],
): RouteObject {
  return {
    element: createElement(ProtectedRoute, { permission: permissionAnyOf }),
    children: routes,
  };
}

export const routes: RouteObject[] = [
  { path: "/login", Component: LoginPage },
  { path: "/forgot-password", Component: ForgotPasswordPage },
  { path: "/reset-password", Component: ResetPasswordPage },
  { path: "/forbidden", Component: ForbiddenPage },

  // Everything below requires an authenticated session. ProtectedRoute will
  // redirect anonymous users to /login (preserving the original path) and
  // forbidden-but-authenticated users to /forbidden.
  {
    element: createElement(ProtectedRoute, {}),
    children: [
      {
        path: "/",
        Component: MainLayout,
        children: [
          {
            index: true,
            element: createElement(HomeRedirect),
          },
          {
            path: "yk",
            Component: SidebarLayout,
            children: [
              {
                index: true,
                element: createElement(HomeRedirect),
              },
              ...generalDashboardRoutes,
              { path: "profile", Component: ProfilePage },
              { path: "change-password", Component: ChangePasswordPage },

              {
                path: "admin/users",
                element: createElement(ProtectedRoute, {
                  permission: ["users.read", "users.manage"],
                }),
                children: [{ index: true, Component: UsersAdminPage }],
              },
              {
                path: "admin/roles",
                element: createElement(ProtectedRoute, {
                  permission: ["roles.read", "roles.manage"],
                }),
                children: [{ index: true, Component: RolesAdminPage }],
              },
              {
                path: "admin/roles/permissions",
                element: createElement(ProtectedRoute, {
                  permission: ["roles.update", "roles.manage"],
                }),
                children: [{ index: true, Component: RolePermissionsPage }],
              },

              // Domain modules: each route group requires the matching
              // <module>.read / .view / .manage permission. Admin bypasses.
              withPermission(
                ["seasons.read", "seasons.view", "seasons.manage"],
                seasonRoutes,
              ),
              withPermission(
                [
                  "entering_paddy.read",
                  "entering_paddy.view",
                  "entering_paddy.manage",
                  // /yk/customers also lives under enteringPaddyRoutes, allow customers perms too
                  "customers.read",
                  "customers.view",
                  "customers.manage",
                ],
                enteringPaddyRoutes,
              ),
              withPermission(
                [
                  "paddy_warehouses.read",
                  "paddy_warehouses.view",
                  "paddy_warehouses.manage",
                  "paddy_processes.read",
                  "paddy_processes.view",
                  "paddy_processes.manage",
                ],
                paddyWarehouseRoutes,
              ),
              withPermission(
                [
                  "rice_warehouses.read",
                  "rice_warehouses.view",
                  "rice_warehouses.manage",
                  "process_rice.read",
                  "process_rice.view",
                  "process_rice.manage",
                  "rice_sales.read",
                  "rice_sales.view",
                  "rice_sales.manage",
                  "rice_charities.read",
                  "rice_charities.view",
                  "rice_charities.manage",
                ],
                riceWarehouseRoutes,
              ),
              withPermission(
                ["stores.read", "stores.view", "stores.manage"],
                storeRoutes,
              ),
              withPermission(
                ["expenses.read", "expenses.view", "expenses.manage"],
                expenseRoutes,
              ),
              withPermission(
                ["currencies.read", "currencies.view", "currencies.manage"],
                currencyRoutes,
              ),
              withPermission(
                [
                  "expense_categories.read",
                  "expense_categories.view",
                  "expense_categories.manage",
                ],
                expenseCategoryRoutes,
              ),
              withPermission(
                ["cash.read", "cash.view", "cash.manage"],
                cashRoutes,
              ),
              withPermission(
                ["employees.read", "employees.view", "employees.manage"],
                employeeRoutes,
              ),
              withPermission(
                ["investors.read", "investors.view", "investors.manage"],
                investorRoutes,
              ),
              withPermission(
                ["jwali.read", "jwali.view", "jwali.manage"],
                jwaliRoutes,
              ),
              withPermission(
                ["sarafi.read", "sarafi.view", "sarafi.manage"],
                sarafiRoutes,
              ),
              withPermission(
                ["reports.read", "reports.view", "reports.manage"],
                reportRoutes,
              ),
              withPermission(
                ["varieties.read", "varieties.view", "varieties.manage"],
                verietiesRoutes,
              ),
            ],
          },
        ],
      },
    ],
  },
];
