"use client";

import * as React from "react";
import { useEffect } from "react";
import { CalendarCog, LayoutDashboard } from "lucide-react";

import { NavAdmin } from "@/components/nav-admin";
import { NavDocuments } from "@/components/nav-documents";
import { NavSecondary } from "@/components/nav-secondary";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Link } from "react-router-dom";
import { NavUser } from "./nav-user";
import { useTranslation } from "react-i18next";
import { SeasonScopeSwitcher } from "@/features/admin/seasons/components/SeasonScopeSwitcher";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "dr" || i18n.language === "ps";

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [i18n.language, isRTL]);

  return (
    <Sidebar collapsible="offcanvas" side={isRTL ? "right" : "left"} {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5 data-[slot=sidebar-menu-button]:!h-auto"
            >
              <Link to="/yk/seasons">
                <img
                  src="/logo.png"
                  alt={t("sidebar:app:logo_alt")}
                  className="size-8 rounded-full"
                />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-semibold">
                    {t("sidebar:app:title")}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t("sidebar:app:subtitle")}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/yk/dashboard">
                <LayoutDashboard className="size-4" />
                <span>{t("sidebar:header:dashboard")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/yk/seasons">
                <CalendarCog className="size-4" />
                <span>{t("sidebar:header:season_management")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <div className="px-2 pb-1">
          <SeasonScopeSwitcher />
        </div>
        <SidebarSeparator />
        <NavDocuments />
        <SidebarSeparator />
        <NavAdmin />
        <NavSecondary items={[]} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
