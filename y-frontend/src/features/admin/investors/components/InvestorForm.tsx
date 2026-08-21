import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "@/components/Fields/InputField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useEffect, useMemo } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { Season } from "../../seasons/schemas/season";
import {
  createInvestorFormSchema,
  type Investor,
  type InvestorFormValues,
} from "../schemas/investor";

interface InvestorFormProps {
  activeSeason: Season | null;
  defaultValues: Investor | null;
  onSubmit: (values: InvestorFormValues) => void;
  isSubmitting?: boolean;
}

export function InvestorForm({ activeSeason, defaultValues, onSubmit, isSubmitting }: InvestorFormProps) {
  const { t } = useTranslation();
  const investorFormSchema = useMemo(() => createInvestorFormSchema(t), [t]);

  const form = useForm<InvestorFormValues>({
    resolver: zodResolver(investorFormSchema) as Resolver<InvestorFormValues>,
    defaultValues: {
      name: defaultValues?.name || "",
      phoneNo: defaultValues?.phoneNo || "",
      address: defaultValues?.address || "",
      sharePercentage: defaultValues?.sharePercentage || "",
      investedAmount: defaultValues?.investedAmount || "0",
      isActive: defaultValues?.isActive ?? true,
      notes: defaultValues?.notes || "",
    },
  });

  useEffect(() => {
    form.reset({
      name: defaultValues?.name || "",
      phoneNo: defaultValues?.phoneNo || "",
      address: defaultValues?.address || "",
      sharePercentage: defaultValues?.sharePercentage || "",
      investedAmount: defaultValues?.investedAmount || "0",
      isActive: defaultValues?.isActive ?? true,
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
          <p className="mt-1 text-xs text-muted-foreground">{t("common:investor_season_hint")}</p>
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
            name="sharePercentage"
            label={t("common:share_percentage")}
            placeholder={t("common:enter", { name: t("common:share_percentage") })}
            control={form.control}
            required
            characterRestriction="none"
          />

          <InputField
            name="investedAmount"
            label={t("common:invested_amount")}
            placeholder={t("common:enter", { name: t("common:invested_amount") })}
            control={form.control}
            required
            characterRestriction="none"
          />

          <InputField
            name="notes"
            label={t("common:notes")}
            placeholder={t("common:enter", { name: t("common:notes") })}
            control={form.control}
            characterRestriction="none"
            className="md:col-span-2"
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="md:col-span-2 flex flex-row items-center gap-3 rounded-md border p-3">
                <FormControl>
                  <Checkbox checked={Boolean(field.value)} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                </FormControl>
                <FormLabel className="m-0 cursor-pointer">{t("common:investor_is_active")}</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting || (!activeSeason && !defaultValues)}>
            {isSubmitting
              ? t("common:saving", { name: t("admin:investor:investor") })
              : t("common:save", { name: t("admin:investor:investor") })}
          </Button>
          <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isSubmitting}>
            {t("common:reset")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
