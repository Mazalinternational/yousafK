import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type AdminRole, rolesApi } from "@/api/roles.api";
import { PermissionGate } from "@/features/auth/components/PermissionGate";
import { formatDisplayNumber, getDisplayLocale } from "@/utils/displayLocale";
import { getErrorMessage } from "@/utils/getErrorMessage";

export function RolesAdminPage() {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const navigate = useNavigate();
  const rolesQuery = useQuery({ queryKey: ["admin", "roles"], queryFn: () => rolesApi.list() });

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(q) ||
        role.slug.toLowerCase().includes(q) ||
        role.description?.toLowerCase().includes(q),
    );
  }, [roles, search]);

  const totalUsers = useMemo(
    () => roles.reduce((acc, role) => acc + role.userCount, 0),
    [roles],
  );
  const systemRolesCount = useMemo(
    () => roles.filter((role) => role.isSystem).length,
    [roles],
  );

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <Card className="border-s-4 border-s-primary/40 bg-gradient-to-r from-primary/5 via-background to-background">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="text-2xl tracking-tight">{t("sidebar:admin:roles")}</CardTitle>
            <CardDescription>{t("common:roles_page_description")}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/yk/admin/roles/permissions">
                <ShieldCheck className="size-4" aria-hidden />
                {t("common:roles_manage_permissions")}
              </Link>
            </Button>
            <PermissionGate permission="roles.create">
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" aria-hidden />
                {t("common:roles_new_role")}
              </Button>
            </PermissionGate>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("common:roles_total_roles")}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatDisplayNumber(roles.length, locale)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("common:roles_system_roles")}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatDisplayNumber(systemRolesCount, locale)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("common:roles_users_in_all_roles")}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatDisplayNumber(totalUsers, locale)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle>{t("common:roles_directory_title")}</CardTitle>
            <CardDescription>{t("common:roles_directory_description")}</CardDescription>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common:roles_search_placeholder")}
            className="w-full sm:max-w-xs"
          />
        </CardHeader>
        <CardContent>
          {rolesQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground">{t("common:roles_no_roles_found")}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  onAssign={() => navigate(`/yk/admin/roles/permissions?roleId=${role.id}`)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RoleCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function RoleCard({ role, onAssign }: { role: AdminRole; onAssign: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: () => rolesApi.remove(role.id),
    onSuccess: () => {
      toast.success(t("common:roles_deleted"));
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, t) || t("common:roles_delete_failed")),
  });

  return (
    <Card className="h-full gap-4">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1 text-start">
            <CardTitle className="text-lg">{role.name}</CardTitle>
            <CardDescription>{role.slug}</CardDescription>
          </div>
          {role.isSystem ? (
            <Badge variant="outline" className="shrink-0 border-blue-500/40 text-blue-700 dark:text-blue-300">
              {t("common:role_permissions_system_badge")}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-start">
        {role.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{role.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("common:role_permissions_no_description")}</p>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4 shrink-0" aria-hidden />
          <span>
            {t("common:role_permissions_users_assigned", {
              count: formatDisplayNumber(role.userCount, locale),
            })}
          </span>
        </div>
        <div>
          {role.slug === "admin" ? (
            <Badge>{t("common:roles_wildcard_badge")}</Badge>
          ) : (
            <Badge variant="secondary">
              {t("common:roles_permissions_assigned", {
                count: formatDisplayNumber(role.permissions.length, locale),
              })}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="mt-auto justify-between gap-2 border-t pt-4">
        <PermissionGate permission="roles.update">
          <Button size="sm" variant="outline" onClick={onAssign} disabled={role.slug === "admin"}>
            {t("common:roles_assign_permissions")}
          </Button>
        </PermissionGate>
        {!role.isSystem && (
          <PermissionGate permission="roles.delete">
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(t("common:roles_delete_confirm", { name: role.name }))) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              title={t("common:roles_delete")}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </PermissionGate>
        )}
      </CardFooter>
    </Card>
  );
}

function RoleCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => {
    setName("");
    setSlug("");
    setDescription("");
  };

  const mutation = useMutation({
    mutationFn: () =>
      rolesApi.create({
        name,
        slug,
        description: description || undefined,
      }),
    onSuccess: () => {
      toast.success(t("common:roles_created"));
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, t) || t("common:roles_create_failed")),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("common:roles_create_dialog_title")}</DialogTitle>
          <DialogDescription>{t("common:roles_create_dialog_description")}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cr-name">{t("common:name")}</Label>
              <Input id="cr-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cr-slug">{t("common:roles_slug")}</Label>
              <Input
                id="cr-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                required
                pattern="[a-z0-9_-]+"
                dir="ltr"
                className="text-start"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-desc">{t("common:description")}</Label>
            <Textarea
              id="cr-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="gap-2">
              {mutation.isPending ? <Spinner className="size-4" /> : null}
              {t("common:roles_create_button")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
