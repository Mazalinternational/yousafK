import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import InputField from "@/components/Fields/InputField";
import { authApi } from "@/api/auth.api";
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
import {
  ChangePasswordFormSchema,
  type ChangePasswordFormValues,
} from "../schemas/profile";
import { useState } from "react";

type ChangePasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(ChangePasswordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("common:change_password")}</DialogTitle>
          <DialogDescription>{t("common:change_password_dialog_description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              setIsSubmitting(true);
              try {
                await authApi.changePassword(values.currentPassword, values.newPassword);
                form.reset();
                toast.success(t("common:password_changed"));
                onOpenChange(false);
              } catch (error) {
                toast.error(getErrorMessage(error, t));
              } finally {
                setIsSubmitting(false);
              }
            })}
          >
            <InputField
              name="currentPassword"
              label={t("common:current_password")}
              control={form.control}
              type="password"
              required
              characterRestriction="none"
            />
            <InputField
              name="newPassword"
              label={t("common:new_password")}
              control={form.control}
              type="password"
              required
              characterRestriction="none"
            />
            <InputField
              name="confirmPassword"
              label={t("common:confirm_password")}
              control={form.control}
              type="password"
              required
              characterRestriction="none"
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("common:cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner className="size-4" /> : null}
                {t("common:update_password")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
