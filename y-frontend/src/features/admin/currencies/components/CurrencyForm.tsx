import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "@/components/Fields/InputField";
import CheckboxField from "@/components/Fields/CheckboxField";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Resolver, useForm } from "react-hook-form";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  createCurrencyCreateFormSchema,
  createCurrencyUpdateFormSchema,
  type Currency,
  type CurrencyCreateFormValues,
  type CurrencyUpdateFormValues,
} from "../schemas/currency";
import { getLocalizedCurrencyName } from "@/utils/currencyDisplay";

export function CurrencyCreateForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: CurrencyCreateFormValues) => void;
  isSubmitting?: boolean;
}) {
  const { t } = useTranslation();
  const schema = useMemo(() => createCurrencyCreateFormSchema(t), [t]);

  const form = useForm<CurrencyCreateFormValues>({
    resolver: zodResolver(schema) as Resolver<CurrencyCreateFormValues>,
    defaultValues: {
      code: "",
      name: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <p className="text-sm text-muted-foreground">{t("common:currencies_create_hint")}</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("common:currency_code")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="off"
                    maxLength={3}
                    placeholder={t("common:currency_code_placeholder")}
                    className="uppercase"
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
                      field.onChange(v);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <InputField
            name="name"
            label={t("common:currency_name")}
            placeholder={t("common:currencies_name_placeholder")}
            control={form.control}
            characterRestriction="none"
            className="md:col-span-2"
          />
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t("common:saving", { name: t("admin:currency") })
              : t("common:save", { name: t("admin:currency") })}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function CurrencyEditForm({
  currency,
  onSubmit,
  isSubmitting,
}: {
  currency: Currency;
  onSubmit: (values: CurrencyUpdateFormValues) => void;
  isSubmitting?: boolean;
}) {
  const { t } = useTranslation();
  const schema = useMemo(() => createCurrencyUpdateFormSchema(t), [t]);

  const form = useForm<CurrencyUpdateFormValues>({
    resolver: zodResolver(schema) as Resolver<CurrencyUpdateFormValues>,
    defaultValues: {
      name: currency.name,
      isActive: currency.isActive,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">{t("common:currency_code")}</p>
          <p className="mt-1 text-base font-semibold tabular-nums">{currency.code}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {getLocalizedCurrencyName(currency.code, currency.name, t)}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputField
            name="name"
            label={t("common:currency_name")}
            placeholder={t("common:enter", { name: t("common:currency_name") })}
            control={form.control}
            required
            characterRestriction="none"
            className="md:col-span-2"
          />
          <CheckboxField
            name="isActive"
            label={t("common:currencies_active_label")}
            control={form.control}
            className="md:col-span-2"
          />
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t("common:saving", { name: t("admin:currency") })
              : t("common:save", { name: t("admin:currency") })}
          </Button>
        </div>
      </form>
    </Form>
  );
}
