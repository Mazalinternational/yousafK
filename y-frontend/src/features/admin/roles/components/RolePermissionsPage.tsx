import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Save, ShieldCheck, Users } from "lucide-react";
import { type AdminRole, rolesApi } from "@/api/roles.api";
import { type PermissionGroup, type PermissionRow, permissionsApi } from "@/api/permissions.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { formatDisplayNumber, getDisplayLocale } from "@/utils/displayLocale";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { PermissionMatrix } from "./PermissionMatrix";

export function RolePermissionsPage() {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const roleIdFromUrl = searchParams.get("roleId") ?? "";

  const rolesQuery = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => rolesApi.list(),
    refetchOnWindowFocus: false,
  });
  const groupsQuery = useQuery({
    queryKey: ["admin", "permissions", "grouped"],
    queryFn: () => permissionsApi.grouped(),
  });
  const permissionsQuery = useQuery({
    queryKey: ["admin", "permissions", "all"],
    queryFn: () => permissionsApi.list(),
  });

  const [selectedRoleId, setSelectedRoleId] = useState(roleIdFromUrl);
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const groupedPermissions = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const allPermissions = useMemo(() => permissionsQuery.data ?? [], [permissionsQuery.data]);
  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );
  const [picked, setPicked] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const pickedRef = useRef<string[]>([]);
  const selectedRoleRef = useRef<AdminRole | null>(null);
  const dirtyRef = useRef(false);
  const hydratedRoleIdRef = useRef<string | null>(null);
  pickedRef.current = picked;
  selectedRoleRef.current = selectedRole;
  dirtyRef.current = dirty;
  const permissionGroups = useMemo(
    () => buildCompletePermissionGroups(groupedPermissions, allPermissions),
    [groupedPermissions, allPermissions],
  );
  const coverage = useMemo(
    () => getPermissionCoverage(groupedPermissions, allPermissions),
    [groupedPermissions, allPermissions],
  );

  useEffect(() => {
    if (!roles.length) return;

    const selectedExists = roles.some((role) => role.id === selectedRoleId);
    if (selectedExists) return;

    const fallbackRoleId = roles.find((role) => role.slug !== "admin")?.id ?? roles[0].id;
    setSelectedRoleId(fallbackRoleId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("roleId", fallbackRoleId);
      return next;
    });
  }, [roles, selectedRoleId, setSearchParams]);

  useEffect(() => {
    if (!selectedRole) {
      setPicked([]);
      setDirty(false);
      hydratedRoleIdRef.current = null;
      return;
    }
    // Only hydrate when the selected role *id* changes. Refetching the roles
    // list used to reset local checkbox state back to the server snapshot,
    // which could then be saved as an empty assignment.
    if (hydratedRoleIdRef.current === selectedRole.id) return;
    hydratedRoleIdRef.current = selectedRole.id;
    setPicked(selectedRole.permissions.map((p) => p.key));
    setDirty(false);
  }, [selectedRole]);

  const mutation = useMutation({
    mutationFn: ({ keys }: { keys: string[]; silent?: boolean }) => {
      const role = selectedRoleRef.current;
      if (!role) {
        throw new Error(t("common:role_permissions_choose_role_first"));
      }
      return rolesApi.setPermissions(role.id, keys);
    },
    onSuccess: (updatedRole, { silent }) => {
      queryClient.setQueryData<AdminRole[]>(["admin", "roles"], (current) => {
        if (!current) return current;
        return current.map((role) => (role.id === updatedRole.id ? updatedRole : role));
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      void refresh();
      if (selectedRoleRef.current?.id !== updatedRole.id) return;
      setDirty(false);
      setPicked(updatedRole.permissions.map((p) => p.key));
      if (!silent) {
        toast.success(t("common:role_permissions_updated"));
      }
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, t) || t("common:role_permissions_update_failed")),
  });

  const loading = rolesQuery.isLoading || groupsQuery.isLoading || permissionsQuery.isLoading;
  const canEditPermissions = !!selectedRole && selectedRole.slug !== "admin";

  const persistCurrentSelection = useCallback(
    (options?: { silent?: boolean }) => {
      const role = selectedRoleRef.current;
      if (!role || role.slug === "admin") return;
      mutation.mutate({
        keys: pickedRef.current,
        silent: Boolean(options?.silent),
      });
    },
    [mutation],
  );

  const persistRef = useRef(persistCurrentSelection);
  persistRef.current = persistCurrentSelection;

  useEffect(() => {
    if (!dirty || !canEditPermissions) return;
    const timer = window.setTimeout(() => persistRef.current({ silent: true }), 500);
    return () => window.clearTimeout(timer);
  }, [picked, dirty, canEditPermissions]);

  useEffect(() => {
    const flush = () => {
      const role = selectedRoleRef.current;
      if (!dirtyRef.current || !role || role.slug === "admin") return;
      rolesApi.persistPermissionsOnUnload(role.id, pickedRef.current);
      dirtyRef.current = false;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, []);

  const handlePickedChange = (next: string[]) => {
    setPicked(next);
    setDirty(true);
  };

  const handleRoleChange = (value: string) => {
    if (dirty && canEditPermissions) {
      persistCurrentSelection({ silent: true });
    }
    hydratedRoleIdRef.current = null;
    setSelectedRoleId(value);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("roleId", value);
      return next;
    });
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <Card className="border-s-4 border-s-primary/40 bg-gradient-to-r from-primary/5 via-background to-background">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="text-2xl tracking-tight">{t("sidebar:admin:role_permissions")}</CardTitle>
            <CardDescription>{t("common:role_permissions_page_description")}</CardDescription>
          </div>
          <Button asChild variant="outline" className="shrink-0 gap-2">
            <Link to="/yk/admin/roles">
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
              {t("common:role_permissions_back_to_roles")}
            </Link>
          </Button>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-base">{t("common:role_permissions_role_selection")}</CardTitle>
              <CardDescription>{t("common:role_permissions_role_selection_description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedRoleId} onValueChange={handleRoleChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("common:role_permissions_select_role_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name} ({role.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedRole ? (
                <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-start">{selectedRole.name}</h3>
                    {selectedRole.isSystem ? (
                      <Badge variant="outline">{t("common:role_permissions_system_badge")}</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground text-start">{selectedRole.slug}</p>
                  {selectedRole.description ? (
                    <p className="text-sm text-muted-foreground text-start">{selectedRole.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-start">
                      {t("common:role_permissions_no_description")}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="size-4 shrink-0" aria-hidden />
                    <span>
                      {t("common:role_permissions_users_assigned", {
                        count: formatDisplayNumber(selectedRole.userCount, locale),
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="size-4 shrink-0" aria-hidden />
                    <span>
                      {selectedRole.slug === "admin"
                        ? t("common:role_permissions_wildcard_access")
                        : t("common:role_permissions_selected_count", {
                            count: formatDisplayNumber(picked.length, locale),
                          })}
                    </span>
                  </div>
                </div>
              ) : null}
            </CardContent>
            <CardFooter>
              <Button
                type="button"
                className="w-full gap-2"
                onClick={() => persistCurrentSelection({ silent: false })}
                disabled={!canEditPermissions || mutation.isPending}
              >
                {mutation.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <Save className="size-4" aria-hidden />
                )}
                {t("common:role_permissions_save")}
              </Button>
            </CardFooter>
          </Card>

          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle className="text-base">{t("common:role_permissions_matrix_title")}</CardTitle>
              <CardDescription>{t("common:role_permissions_matrix_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {coverage.hasMismatch ? (
                <div className="mb-4 rounded-lg border border-amber-300/70 bg-amber-50/80 p-3 text-sm text-amber-900 dark:border-amber-400/50 dark:bg-amber-950/20 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="size-4 shrink-0" aria-hidden />
                    <span>{t("common:role_permissions_mismatch_title")}</span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm">
                    {t("common:role_permissions_mismatch_body", {
                      moduleCount: formatDisplayNumber(coverage.missingModules.length, locale),
                      permissionCount: formatDisplayNumber(coverage.missingPermissionKeys.length, locale),
                    })}
                  </p>
                  {coverage.missingModules.length > 0 ? (
                    <p className="mt-1 text-xs sm:text-sm">
                      {t("common:role_permissions_missing_modules", {
                        list: coverage.missingModules.slice(0, 6).join(", "),
                      })}
                      {coverage.missingModules.length > 6 ? ", ..." : ""}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {selectedRole?.slug === "admin" ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  {t("common:role_permissions_admin_wildcard_note")}
                </div>
              ) : (
                <PermissionMatrix
                  groups={permissionGroups}
                  value={picked}
                  onChange={handlePickedChange}
                  disabled={!selectedRole}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function buildCompletePermissionGroups(
  groupedPermissions: PermissionGroup[],
  allPermissions: PermissionRow[],
): PermissionGroup[] {
  const moduleMap = new Map<string, Map<string, { id: string; key: string; action: string }>>();

  for (const group of groupedPermissions) {
    const permissionMap =
      moduleMap.get(group.module) ??
      new Map<string, { id: string; key: string; action: string }>();

    for (const permission of group.permissions) {
      permissionMap.set(permission.key, permission);
    }

    moduleMap.set(group.module, permissionMap);
  }

  for (const permission of allPermissions) {
    const permissionMap =
      moduleMap.get(permission.module) ??
      new Map<string, { id: string; key: string; action: string }>();

    if (!permissionMap.has(permission.key)) {
      permissionMap.set(permission.key, {
        id: permission.id,
        key: permission.key,
        action: permission.action,
      });
    }

    moduleMap.set(permission.module, permissionMap);
  }

  return Array.from(moduleMap.entries())
    .map(([module, permissions]) => ({
      module,
      permissions: Array.from(permissions.values()).sort((a, b) =>
        a.action.localeCompare(b.action),
      ),
    }))
    .sort((a, b) => a.module.localeCompare(b.module));
}

function getPermissionCoverage(
  groupedPermissions: PermissionGroup[],
  allPermissions: PermissionRow[],
) {
  const groupedModules = new Set(groupedPermissions.map((group) => group.module));
  const groupedKeys = new Set(
    groupedPermissions.flatMap((group) => group.permissions.map((permission) => permission.key)),
  );

  const missingModules = Array.from(
    new Set(
      allPermissions
        .map((permission) => permission.module)
        .filter((module) => !groupedModules.has(module)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const missingPermissionKeys = Array.from(
    new Set(
      allPermissions
        .map((permission) => permission.key)
        .filter((permissionKey) => !groupedKeys.has(permissionKey)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return {
    hasMismatch: missingModules.length > 0 || missingPermissionKeys.length > 0,
    missingModules,
    missingPermissionKeys,
  };
}
