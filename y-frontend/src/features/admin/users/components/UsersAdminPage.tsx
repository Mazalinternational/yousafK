import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Lock, ShieldCheck, ShieldOff, Trash2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type AdminUserSummary, usersApi } from "@/api/users.api";
import { rolesApi } from "@/api/roles.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { PermissionGate } from "@/features/auth/components/PermissionGate";
import { getDisplayLocale } from "@/utils/displayLocale";
import { getErrorMessage } from "@/utils/getErrorMessage";

function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function UsersAdminPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState("");

  const usersQuery = useQuery({
    queryKey: ["admin", "users", { query }],
    queryFn: () => usersApi.list({ query: query || undefined, pageSize: 50 }),
  });
  const rolesQuery = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => rolesApi.list(),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUserSummary | null>(null);
  const [rolesTarget, setRolesTarget] = useState<AdminUserSummary | null>(null);

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("sidebar:admin:users")}</h1>
          <p className="text-sm text-muted-foreground">{t("common:users_page_description")}</p>
        </div>
        <PermissionGate permission="users.create">
          <Button className="gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" aria-hidden />
            {t("common:users_new_user")}
          </Button>
        </PermissionGate>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder={t("common:users_search_placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-start">{t("common:name")}</TableHead>
              <TableHead className="text-start">{t("common:email")}</TableHead>
              <TableHead className="text-start">{t("common:roles")}</TableHead>
              <TableHead className="text-start">{t("common:status")}</TableHead>
              <TableHead className="text-end">{t("common:users_last_login")}</TableHead>
              <TableHead className="text-end">{t("common:actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  <Spinner className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : usersQuery.data?.items.length ? (
              usersQuery.data.items.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  isSelf={u.id === currentUser?.id}
                  onEdit={() => setEditTarget(u)}
                  onAssignRoles={() => setRolesTarget(u)}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {t("common:users_no_users_found")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <UserCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        roles={rolesQuery.data ?? []}
      />
      <UserEditDialog
        target={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />
      <UserRolesDialog
        target={rolesTarget}
        roles={rolesQuery.data ?? []}
        onOpenChange={(open) => !open && setRolesTarget(null)}
      />
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  onEdit,
  onAssignRoles,
}: {
  user: AdminUserSummary;
  isSelf: boolean;
  onEdit: () => void;
  onAssignRoles: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const queryClient = useQueryClient();

  const toggleActiveMutation = useMutation({
    mutationFn: () =>
      user.isActive ? usersApi.disable(user.id) : usersApi.enable(user.id),
    onSuccess: () => {
      toast.success(user.isActive ? t("common:users_disabled_toast") : t("common:users_enabled_toast"));
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, t) || t("common:users_update_failed")),
  });

  const forceLogoutMutation = useMutation({
    mutationFn: () => usersApi.forceLogout(user.id),
    onSuccess: () => toast.success(t("common:users_sessions_revoked")),
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, t) || t("common:users_force_logout_failed")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.remove(user.id),
    onSuccess: () => {
      toast.success(t("common:users_deleted"));
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, t) || t("common:users_delete_failed")),
  });

  return (
    <TableRow>
      <TableCell className="font-medium text-start">
        {user.name}
        {isSelf ? (
          <Badge variant="outline" className="ms-2">
            {t("common:users_you")}
          </Badge>
        ) : null}
      </TableCell>
      <TableCell className="text-start">{user.email}</TableCell>
      <TableCell className="text-start">
        <div className="flex flex-wrap gap-1">
          {user.roles.length === 0 ? (
            <span className="text-xs text-muted-foreground">{t("common:users_roles_none")}</span>
          ) : (
            user.roles.map((r) => (
              <Badge
                key={r.id}
                variant={r.slug === "admin" ? "default" : "secondary"}
              >
                {r.name}
              </Badge>
            ))
          )}
        </div>
      </TableCell>
      <TableCell className="text-start">
        {user.isActive ? (
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
            {t("common:active")}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
            {t("common:users_disabled")}
          </Badge>
        )}
        {user.isLocked ? (
          <Badge variant="destructive" className="ms-1">
            {t("common:users_locked")}
          </Badge>
        ) : null}
      </TableCell>
      <TableCell className="text-end tabular-nums text-muted-foreground">
        {user.lastLoginAt
          ? formatDateTime(user.lastLoginAt, locale)
          : t("common:users_last_login_never")}
      </TableCell>
      <TableCell className="text-end">
        <div className="flex justify-end gap-1">
          <PermissionGate permission={["users.assign", "users.update"]}>
            <Button
              size="sm"
              variant="ghost"
              onClick={onAssignRoles}
              title={t("common:users_assign_roles")}
            >
              <ShieldCheck className="size-4" aria-hidden />
            </Button>
          </PermissionGate>
          <PermissionGate permission="users.update">
            <Button size="sm" variant="ghost" onClick={onEdit} title={t("common:users_edit")}>
              {t("common:users_edit")}
            </Button>
          </PermissionGate>
          <PermissionGate permission="users.update">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleActiveMutation.mutate()}
              disabled={toggleActiveMutation.isPending || isSelf}
              title={user.isActive ? t("common:users_disable") : t("common:users_enable")}
            >
              <ShieldOff className="size-4" aria-hidden />
            </Button>
          </PermissionGate>
          <PermissionGate permission="users.update">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => forceLogoutMutation.mutate()}
              disabled={forceLogoutMutation.isPending}
              title={t("common:users_force_logout")}
            >
              <Lock className="size-4" aria-hidden />
            </Button>
          </PermissionGate>
          <PermissionGate permission="users.delete">
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(t("common:users_delete_confirm", { email: user.email }))) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending || isSelf}
              title={t("common:users_delete")}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </PermissionGate>
        </div>
      </TableCell>
    </TableRow>
  );
}

function UserCreateDialog({
  open,
  onOpenChange,
  roles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: { id: string; slug: string; name: string }[];
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const reset = () => {
    setEmail("");
    setName("");
    setPassword("");
    setSelectedRoles([]);
  };

  const mutation = useMutation({
    mutationFn: () =>
      usersApi.create({ email, name, password, roles: selectedRoles }),
    onSuccess: () => {
      toast.success(t("common:users_created"));
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, t) || t("common:users_create_failed")),
  });

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("common:users_create_dialog_title")}</DialogTitle>
          <DialogDescription>{t("common:users_create_dialog_description")}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="cu-name">{t("common:name")}</Label>
            <Input id="cu-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">{t("common:email")}</Label>
            <Input
              id="cu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-pass">{t("common:users_initial_password")}</Label>
            <Input
              id="cu-pass"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <RolesPicker roles={roles} selected={selectedRoles} onChange={setSelectedRoles} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="gap-2">
              {mutation.isPending ? <Spinner className="size-4" /> : null}
              {t("common:users_create_button")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserEditDialog({
  target,
  onOpenChange,
}: {
  target: AdminUserSummary | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useMemo(() => {
    if (target) {
      setName(target.name);
      setEmail(target.email);
      setPassword("");
    }
  }, [target]);

  const mutation = useMutation({
    mutationFn: () =>
      usersApi.update(target!.id, {
        name,
        email,
        password: password || undefined,
      }),
    onSuccess: () => {
      toast.success(t("common:users_updated"));
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, t) || t("common:users_update_failed")),
  });

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("common:users_edit_dialog_title")}</DialogTitle>
          <DialogDescription>{t("common:users_edit_dialog_description")}</DialogDescription>
        </DialogHeader>
        {target ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="eu-name">{t("common:name")}</Label>
              <Input id="eu-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eu-email">{t("common:email")}</Label>
              <Input
                id="eu-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eu-pass">{t("common:users_new_password_optional")}</Label>
              <Input
                id="eu-pass"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("common:users_password_unchanged")}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common:cancel")}
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="gap-2">
                {mutation.isPending ? <Spinner className="size-4" /> : null}
                {t("common:users_save_button")}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function UserRolesDialog({
  target,
  roles,
  onOpenChange,
}: {
  target: AdminUserSummary | null;
  roles: { id: string; slug: string; name: string }[];
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);

  useMemo(() => {
    if (target) setSelected(target.roles.map((r) => r.slug));
  }, [target]);

  const mutation = useMutation({
    mutationFn: () => usersApi.assignRoles(target!.id, selected),
    onSuccess: () => {
      toast.success(t("common:users_roles_updated"));
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onOpenChange(false);
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, t) || t("common:users_assign_roles_failed")),
  });

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("common:users_assign_roles_dialog_title")}</DialogTitle>
          <DialogDescription>{t("common:users_assign_roles_dialog_description")}</DialogDescription>
        </DialogHeader>
        {target ? (
          <div className="space-y-4">
            <RolesPicker roles={roles} selected={selected} onChange={setSelected} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common:cancel")}
              </Button>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
                {mutation.isPending ? <Spinner className="size-4" /> : null}
                {t("common:users_save_button")}
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RolesPicker({
  roles,
  selected,
  onChange,
}: {
  roles: { id: string; slug: string; name: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Label>{t("common:roles")}</Label>
      <div className="space-y-2 rounded-md border p-3">
        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("common:users_no_roles_defined")}</p>
        ) : (
          roles.map((role) => {
            const checked = selected.includes(role.slug);
            return (
              <label
                key={role.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) => {
                    if (next) onChange([...selected, role.slug]);
                    else onChange(selected.filter((s) => s !== role.slug));
                  }}
                />
                <span>
                  {role.name}{" "}
                  <span className="text-xs text-muted-foreground">({role.slug})</span>
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
