import { ChevronRight, ShieldCheck, Users } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";

type NavAdminProps = {
  /** Shared accordion key with NavDocuments; null = closed. */
  openClusterKey: string | null;
  onOpenClusterChange: (key: string | null) => void;
};

/**
 * Admin sidebar group. Only renders the menu items the current user has
 * permission to see. Hidden entirely if the user has zero admin permissions.
 */
export function NavAdmin({ openClusterKey, onOpenClusterChange }: NavAdminProps) {
  const { t } = useTranslation();
  const { can } = useAuth();
  const { pathname } = useLocation();
  const clusterKey = "administration";

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

  const hasActive = items.some((it) => pathname.startsWith(it.url));
  const isOpen = openClusterKey === clusterKey;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(open) => onOpenClusterChange(open ? clusterKey : null)}
      className="group/cluster"
    >
      <SidebarGroup className="px-2 py-1 group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel asChild className="p-0">
          <CollapsibleTrigger className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 data-[state=open]:bg-sidebar-accent/50 data-[state=open]:text-sidebar-accent-foreground">
            <span className="truncate">{t("sidebar:admin:group")}</span>
            {hasActive ? (
              <span className="size-1.5 shrink-0 rounded-full bg-sidebar-primary" aria-hidden />
            ) : null}
            <ChevronRight className="ms-auto size-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]/cluster:rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent className="motion-safe:will-change-[height,opacity]">
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
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
