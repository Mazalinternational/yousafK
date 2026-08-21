import {
  Camera,
  KeyRound,
  Mail,
  Pencil,
  Shield,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { dateFormatter } from "@/utils/dataFormatters";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { ChangePasswordDialog } from "../components/ChangePasswordDialog";
import { EditProfileDialog } from "../components/EditProfileDialog";
import { useAuth } from "../hooks/useAuth";
import {
  useRemoveProfileAvatar,
  useUploadProfileAvatar,
} from "../hooks/useProfileMutations";
import { resolveProfilePictureUrl } from "../utils/profile-picture";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .padEnd(2, "·");
}

export function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const { mutate: uploadAvatar, isPending: isUploading } = useUploadProfileAvatar();
  const { mutate: removeAvatar, isPending: isRemoving } = useRemoveProfileAvatar();

  if (!user) {
    return null;
  }

  const avatarUrl = resolveProfilePictureUrl(user.profilePictureUrl);
  const isAvatarBusy = isUploading || isRemoving;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error(t("common:profile_picture_invalid_type"));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("common:profile_picture_too_large"));
      return;
    }

    uploadAvatar(file, {
      onSuccess: () => toast.success(t("common:profile_picture_updated")),
      onError: (error) => toast.error(getErrorMessage(error, t)),
    });
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 p-4 md:p-6 lg:p-8">
      <section className="w-full overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="h-28 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 md:h-36" />
        <div className="relative px-4 pb-6 md:px-8">
          <div className="-mt-14 flex flex-col gap-5 md:-mt-16 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative">
                <Avatar className="size-28 border-4 border-background shadow-md md:size-32">
                  <AvatarImage src={avatarUrl} alt={user.name} />
                  <AvatarFallback className="text-2xl font-semibold">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                {isAvatarBusy ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <Spinner className="size-6 text-white" />
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
                  {user.isAdmin ? <Badge>{t("common:admin")}</Badge> : null}
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? t("common:active") : t("common:inactive")}
                  </Badge>
                </div>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-4 shrink-0" />
                  {user.email}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                <Pencil className="mr-2 size-4" />
                {t("common:edit_profile")}
              </Button>
              <Button variant="outline" onClick={() => setIsPasswordOpen(true)}>
                <KeyRound className="mr-2 size-4" />
                {t("common:change_password")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid w-full min-w-0 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">{t("common:profile_picture")}</CardTitle>
            <CardDescription>{t("common:profile_picture_description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-20 border">
                <AvatarImage src={avatarUrl} alt={user.name} />
                <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{t("common:profile_picture_hint")}</p>
                <p>{t("common:profile_picture_formats")}</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={isAvatarBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="mr-2 size-4" />
                {isUploading ? t("common:uploading") : t("common:upload_photo")}
              </Button>
              {avatarUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isAvatarBusy}
                  onClick={() =>
                    removeAvatar(undefined, {
                      onSuccess: () => toast.success(t("common:profile_picture_removed")),
                      onError: (error) => toast.error(getErrorMessage(error, t)),
                    })
                  }
                >
                  <Trash2 className="mr-2 size-4" />
                  {t("common:remove_photo")}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle2 className="size-5" />
              {t("common:account_details")}
            </CardTitle>
            <CardDescription>{t("common:account_details_description")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <InfoTile label={t("common:name")} value={user.name} />
            <InfoTile label={t("common:email")} value={user.email} />
            <InfoTile
              label={t("common:status")}
              value={user.isActive ? t("common:active") : t("common:inactive")}
            />
            <InfoTile
              label={t("common:member_since")}
              value={user.createdAt ? dateFormatter(user.createdAt) : "—"}
            />
          </CardContent>
        </Card>

        <Card className="h-full md:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="size-5" />
                {t("common:access_and_roles")}
              </CardTitle>
              <CardDescription>{t("common:access_and_roles_description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("common:roles")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {user.roles.length === 0 ? (
                    <span className="text-sm text-muted-foreground">{t("common:no_data")}</span>
                  ) : (
                    user.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {role}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("common:permissions")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user.isAdmin
                    ? t("common:admin_full_access")
                    : t("common:permissions_count", { count: user.permissions.length })}
                </p>
              </div>
            </CardContent>
        </Card>
      </div>

      <EditProfileDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        defaultName={user.name}
      />
      <ChangePasswordDialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen} />
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium break-all">{value}</p>
    </div>
  );
}