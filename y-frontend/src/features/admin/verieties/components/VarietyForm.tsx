import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "@/components/Fields/InputField";
import CheckboxField from "@/components/Fields/CheckboxField";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Resolver, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  createVarietyCreateFormSchema,
  createVarietyUpdateFormSchema,
  type Variety,
  type VarietyCreateFormValues,
  type VarietyUpdateFormValues,
} from "../schemas/variety";

export function VarietyCreateForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: VarietyCreateFormValues) => void;
  isSubmitting?: boolean;
}) {
  const { t } = useTranslation();
  const createSchema = useMemo(() => createVarietyCreateFormSchema(t), [t]);

  const form = useForm<VarietyCreateFormValues>({
    resolver: zodResolver(createSchema) as Resolver<VarietyCreateFormValues>,
    defaultValues: {
      code: "",
      name: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <p className="text-sm text-muted-foreground">{t("common:verieties_form_description")}</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("common:veriety_code")}</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="off" maxLength={64} placeholder={t("common:veriety_code_placeholder")} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <InputField
            name="name"
            label={t("common:name")}
            placeholder={t("common:enter", { name: t("common:name") })}
            control={form.control}
            required
            characterRestriction="none"
            className="md:col-span-2"
          />
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t("common:saving", { name: t("admin:veriety") })
              : t("common:save", { name: t("admin:veriety") })}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function VarietyEditForm({
  variety,
  onSubmit,
  isSubmitting,
}: {
  variety: Variety;
  onSubmit: (values: VarietyUpdateFormValues) => void;
  isSubmitting?: boolean;
}) {
  const { t } = useTranslation();
  const updateSchema = useMemo(() => createVarietyUpdateFormSchema(t), [t]);

  const form = useForm<VarietyUpdateFormValues>({
    resolver: zodResolver(updateSchema) as Resolver<VarietyUpdateFormValues>,
    defaultValues: {
      name: variety.name,
      isActive: variety.isActive,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">{t("common:veriety_code")}</p>
          <p className="mt-1 text-base font-semibold">{variety.code}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputField
            name="name"
            label={t("common:name")}
            placeholder={t("common:enter", { name: t("common:name") })}
            control={form.control}
            required
            characterRestriction="none"
            className="md:col-span-2"
          />
          <CheckboxField
            name="isActive"
            label={t("common:verieties_active_label")}
            control={form.control}
            className="md:col-span-2"
          />
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t("common:saving", { name: t("admin:veriety") })
              : t("common:save", { name: t("admin:veriety") })}
          </Button>
        </div>
      </form>
    </Form>
  );
}
