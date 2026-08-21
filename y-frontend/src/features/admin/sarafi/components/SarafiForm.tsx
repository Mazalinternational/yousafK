import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "@/components/Fields/InputField";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useEffect } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { Season } from "../../seasons/schemas/season";
import { SarafFormSchema, type Saraf, type SarafFormValues } from "../schemas/sarafi";

interface SarafiFormProps {
  activeSeason: Season | null;
  defaultValues: Saraf | null;
  onSubmit: (values: SarafFormValues) => void;
  isSubmitting?: boolean;
}

export function SarafiForm({ activeSeason, defaultValues, onSubmit, isSubmitting }: SarafiFormProps) {
  const { t } = useTranslation();

  const form = useForm<SarafFormValues>({
    resolver: zodResolver(SarafFormSchema) as Resolver<SarafFormValues>,
    defaultValues: {
      name: defaultValues?.name || "",
      phoneNo: defaultValues?.phoneNo || "",
      address: defaultValues?.address || "",
      notes: defaultValues?.notes || "",
    },
  });

  useEffect(() => {
    form.reset({
      name: defaultValues?.name || "",
      phoneNo: defaultValues?.phoneNo || "",
      address: defaultValues?.address || "",
      notes: defaultValues?.notes || "",
    });
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">{t("common:season")}</p>
          <p className="mt-1 text-base font-semibold">
            {activeSeason?.name || defaultValues?.seasonName || t("common:no_active_season")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("common:sarafi_season_hint")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputField
            name="name"
            label={t("common:name")}
            placeholder={t("common:enter", { name: t("common:name") })}
            control={form.control}
            required
            characterRestriction="none"
          />

          <InputField
            name="phoneNo"
            label={t("common:phone_number")}
            placeholder={t("common:enter", { name: t("common:phone_number") })}
            control={form.control}
            required
            characterRestriction="none"
          />

          <InputField
            name="address"
            label={t("common:address")}
            placeholder={t("common:enter", { name: t("common:address") })}
            control={form.control}
            required
            characterRestriction="none"
            className="md:col-span-2"
          />

          <InputField
            name="notes"
            label={t("common:notes")}
            placeholder={t("common:enter", { name: t("common:notes") })}
            control={form.control}
            characterRestriction="none"
            className="md:col-span-2"
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting || (!activeSeason && !defaultValues)}>
            {isSubmitting
              ? t("common:saving", { name: t("admin:sarafi:saraf") })
              : t("common:save", { name: t("admin:sarafi:saraf") })}
          </Button>

          <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isSubmitting}>
            {t("common:reset")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
