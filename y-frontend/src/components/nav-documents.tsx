import { NavLink, useLocation } from "react-router-dom";
import { ChevronRight, LayoutDashboard } from "lucide-react";
import {
  SidebarGroupContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  getCustomerMenus,
  getEmployeeMenus,
  getCashMenus,
  getExpenseMenus,
  getEnteringPaddyMenus,
  getInvestorMenus,
  getJwaliMenus,
  getSarafiMenus,
  getPaddyProcessMenus,
  getPaddyWarehouseMenus,
  getReportMenus,
  getRiceWarehouseMenus,
  getSeasonMenus,
  getStoreMenus,
  getVerietyMenus,
  type AdminMenuItem,
} from "@/features/admin/routes";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/hooks/useAuth";

/**
 * Maps each top-level sidebar section to the canonical backend RBAC module
 * slug it represents. The section is hidden whenever the current user has
 * NO read/view permission for that module (and is not admin).
 *
 * Children that belong to a *different* module than their parent section
 * (e.g. "Process Rice" lives under the Rice Warehouse section but is its
 * own `process_rice` module) are listed in `CHILD_URL_MODULE` so they can
 * be filtered independently.
 */
type RbacModule =
  | "seasons"
  | "customers"
  | "entering_paddy"
  | "paddy_warehouses"
  | "paddy_processes"
  | "rice_warehouses"
  | "rice_sales"
  | "rice_charities"
  | "process_rice"
  | "stores"
  | "expenses"
  | "cash"
  | "employees"
  | "investors"
  | "jwali"
  | "sarafi"
  | "currencies"
  | "expense_categories"
  | "reports"
  | "varieties";

interface SidebarSection {
  module: RbacModule;
  items: AdminMenuItem[];
}

type SidebarCluster = {
  key: string;
  label: string;
  modules: RbacModule[];
};

// URLs whose backend module differs from the parent section's module.
// Example: /yk/process-rice lives under the Rice Warehouse section in the
// UI, but is enforced by the `process_rice` module on the backend, so it
// should be hidden independently if the user lacks process_rice perms.
const CHILD_URL_MODULE: Record<string, RbacModule> = {
  "/yk/process-rice": "process_rice",
  "/yk/rice-sales": "rice_sales",
  "/yk/rice-charity": "rice_charities",
  "/yk/expenses-dashboard": "expenses",
  "/yk/expenses": "expenses",
  "/yk/currencies": "currencies",
  "/yk/expense-categories": "expense_categories",
  "/yk/cash-dashboard": "cash",
  "/yk/cash": "cash",
};

export function NavDocuments() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { can, status } = useAuth();

  const allSections = useMemo<SidebarSection[]>(() => {
    if (!pathname.startsWith("/yk/")) return [];
    return [
      {
        module: "seasons",
        items: getSeasonMenus(t),
      },
      {
        module: "varieties",
        items: getVerietyMenus(t),
      },
      {
        module: "customers",
        items: getCustomerMenus(t),
      },
      {
        module: "entering_paddy",
        items: getEnteringPaddyMenus(t),
      },
      {
        module: "paddy_warehouses",
        items: getPaddyWarehouseMenus(t),
      },
      {
        module: "paddy_processes",
        items: getPaddyProcessMenus(t),
      },
      {
        module: "rice_warehouses",
        items: getRiceWarehouseMenus(t),
      },
      {
        module: "stores",
        items: getStoreMenus(t),
      },
      {
        module: "expenses",
        items: getExpenseMenus(t),
      },
      {
        module: "cash",
        items: getCashMenus(t),
      },
      {
        module: "employees",
        items: getEmployeeMenus(t),
      },
      {
        module: "investors",
        items: getInvestorMenus(t),
      },
      {
        module: "jwali",
        items: getJwaliMenus(t),
      },
      {
        module: "sarafi",
        items: getSarafiMenus(t),
      },
      {
        module: "reports",
        items: getReportMenus(t),
      },
    ];
  }, [pathname, t]);

  // True iff the user can READ (or VIEW or MANAGE) anything in `mod`.
  const canSeeModule = useMemo(
    () => (mod: RbacModule) =>
      can(`${mod}.read`) || can(`${mod}.view`) || can(`${mod}.manage`),
    [can],
  );

  const sections = useMemo<SidebarSection[]>(() => {
    if (status !== "authenticated") return [];
    return allSections
      .filter((sec) =>
        sec.module === "expenses"
          ? canSeeModule("expenses") ||
            canSeeModule("expense_categories") ||
            canSeeModule("currencies")
          : canSeeModule(sec.module),
      )
      .map((sec) => {
        const filteredItems = sec.items
          .map((item) => {
            if (!item.children?.length) return item;
            // Each child may belong to a different module (e.g. process-rice).
            const visibleChildren = item.children.filter((child) => {
              const childModule = CHILD_URL_MODULE[child.url];
              const requiredModule = childModule ?? sec.module;
              return canSeeModule(requiredModule);
            });
            return { ...item, children: visibleChildren };
          })
          .filter(
            (item) => !item.children || item.children.length > 0,
          );
        return { ...sec, items: filteredItems };
      })
      .filter((sec) => sec.items.length > 0);
  }, [allSections, canSeeModule, status]);

  const clusters = useMemo<SidebarCluster[]>(
    () => [
      {
        key: "operations",
        label: t("sidebar:group:operations"),
        modules: [
          "seasons",
          "varieties",
          "customers",
          "entering_paddy",
          "paddy_warehouses",
          "paddy_processes",
          "rice_warehouses",
          "stores",
        ],
      },
      {
        key: "finance",
        label: t("sidebar:group:finance"),
        modules: ["expenses", "cash", "investors", "sarafi", "jwali"],
      },
      {
        key: "people",
        label: t("sidebar:group:people"),
        modules: ["employees"],
      },
      {
        key: "insights",
        label: t("sidebar:group:insights"),
        modules: ["reports"],
      },
    ],
    [t],
  );

  const groupedSections = useMemo(() => {
    const byModule = new Map<RbacModule, SidebarSection>();
    for (const section of sections) {
      byModule.set(section.module, section);
    }

    return clusters
      .map((cluster) => {
        const items = cluster.modules.flatMap((mod) => byModule.get(mod)?.items ?? []);
        return { ...cluster, items };
      })
      .filter((cluster) => cluster.items.length > 0);
  }, [clusters, sections]);

  const activeTopLevelMenu = useMemo(() => {
    for (const { items } of groupedSections) {
      const activeItem = items.find((item) =>
        item.children?.some((child) => pathname.startsWith(child.url)),
      );

      if (activeItem) {
        return activeItem.url;
      }
    }

    return null;
  }, [groupedSections, pathname]);

  const [openMenuUrl, setOpenMenuUrl] = useState<string | null>(
    activeTopLevelMenu,
  );

  useEffect(() => {
    setOpenMenuUrl(activeTopLevelMenu);
  }, [activeTopLevelMenu]);

  if (groupedSections.length === 0) return null;

  return (
    <>
      <SidebarGroup className="px-2 py-1 group-data-[collapsible=icon]:hidden">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/yk/dashboard"}>
                <NavLink to="/yk/dashboard" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{t("sidebar:dashboard:general")}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {groupedSections.map((cluster) => (
        <SidebarGroup
          key={cluster.key}
          className="px-2 py-1 group-data-[collapsible=icon]:hidden"
        >
          <SidebarGroupLabel>{cluster.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cluster.items.map((item) => {
                const isExactActive = pathname === item.url;
                const hasActiveChild = item.children?.some((child) =>
                  pathname.startsWith(child.url),
                );

                if (!item.children?.length) {
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isExactActive}>
                        <NavLink
                          to={item.url}
                          className="flex items-center gap-2"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                if (item.children.length === 1) {
                  const onlyChild = item.children[0];
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={pathname.startsWith(onlyChild.url)}>
                        <NavLink to={onlyChild.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <Collapsible
                    key={item.url}
                    asChild
                    open={openMenuUrl === item.url}
                    onOpenChange={(open) => {
                      setOpenMenuUrl(open ? item.url : null);
                    }}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.name}
                          isActive={Boolean(hasActiveChild)}
                          className="cursor-pointer"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                          <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="motion-safe:will-change-[height,opacity]">
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.url}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === child.url}
                              >
                                <NavLink to={child.url}>
                                  <span>{child.name}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
