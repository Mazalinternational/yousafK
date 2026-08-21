"use client";

import { ChevronsUpDown, LogOut, ShieldCheck, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { resolveProfilePictureUrl } from "@/features/auth/utils/profile-picture";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .padEnd(2, "·");
}

export function NavUser() {
  const { t } = useTranslation();
  const { isMobile } = useSidebar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const display = user
    ? { name: user.name, email: user.email }
    : { name: t("sidebar:ui:loading_user"), email: "" };
  const isAdmin = user?.isAdmin ?? false;
  const avatarUrl = resolveProfilePictureUrl(user?.profilePictureUrl);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatarUrl} alt={display.name} />
                <AvatarFallback className="rounded-lg">
                  {user ? initials(user.name) : "··"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-medium">{display.name}</span>
                <span className="truncate text-xs">{display.email}</span>
              </div>
              <ChevronsUpDown className="ms-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={display.name} />
                  <AvatarFallback className="rounded-lg">
                    {user ? initials(user.name) : "··"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-medium">{display.name}</span>
                  <span className="truncate text-xs">{display.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => navigate("/yk/profile")}>
                <UserCircle2 />
                {t("common:profile")}
              </DropdownMenuItem>
              {isAdmin ? (
                <>
                  <DropdownMenuItem onSelect={() => navigate("/yk/admin/users")}>
                    <ShieldCheck />
                    {t("common:manage_users")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate("/yk/admin/roles")}>
                    <ShieldCheck />
                    {t("common:roles_and_permissions")}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                await logout();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut />
              {t("common:log_out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}