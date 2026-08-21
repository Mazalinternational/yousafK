import { ShieldCheck, Users } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";

/**
 * Admin sidebar group. Only renders the menu items the current user has
 * permission to see. Hidden entirely if the user has zero admin permissions
 * (a permission-aware sidebar is the simplest way to satisfy the
 * "menu visibility based on permissions" requirement).
 */
export function NavAdmin() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const { pathname } = useLocation();

  const items = [
    {
      url: "/yk/admin/users",
      label: t("sidebar:admin:users"),
      icon: Users,
      perm: "users.read",
    },
    {
      url: "/yk/admin/roles",
      label: t("sidebar:admin:roles"),
      icon: ShieldCheck,
      perm: "roles.read",
    },
    {
      url: "/yk/admin/roles/permissions",
      label: t("sidebar:admin:role_permissions"),
      icon: ShieldCheck,
      perm: "roles.update",
    },
  ].filter((it) => can(it.perm));

  if (items.length === 0) return null;

  return (
    <SidebarGroup className="px-2 py-1 group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{t("sidebar:admin:group")}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((it) => (
            <SidebarMenuItem key={it.url}>
              <SidebarMenuButton asChild isActive={pathname.startsWith(it.url)}>
                <NavLink to={it.url} className="flex items-center gap-2">
                  <it.icon className="h-4 w-4" />
                  <span>{it.label}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
