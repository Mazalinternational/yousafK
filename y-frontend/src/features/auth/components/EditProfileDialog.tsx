import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import InputField from "@/components/Fields/InputField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useUpdateProfile } from "../hooks/useProfileMutations";
import {
  EditProfileFormSchema,
  type EditProfileFormValues,
} from "../schemas/profile";

type EditProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
};

export function EditProfileDialog({
  open,
  onOpenChange,
  defaultName,
}: EditProfileDialogProps) {
  const { t } = useTranslation();
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const form = useForm<EditProfileFormValues>({
    resolver: zodResolver(EditProfileFormSchema),
    defaultValues: { name: defaultName },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: defaultName });
    }
  }, [open, defaultName, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("common:edit_profile")}</DialogTitle>
          <DialogDescription>{t("common:edit_profile_description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => {
              updateProfile(values.name, {
                onSuccess: () => {
                  toast.success(t("common:profile_updated"));
                  onOpenChange(false);
                },
                onError: (error) => {
                  toast.error(getErrorMessage(error, t));
                },
              });
            })}
          >
            <InputField
              name="name"
              label={t("common:name")}
              control={form.control}
              required
              characterRestriction="none"
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t("common:cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner className="size-4" /> : null}
                {t("common:save_changes")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
