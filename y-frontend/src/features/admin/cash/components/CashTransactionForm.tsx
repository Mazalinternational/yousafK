import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formatCurrencyLabel } from "@/utils/currencyDisplay";
import { useCurrencies } from "../../currencies/hooks/useCurrencies";
import type { Season } from "../../seasons/schemas/season";
import {
  createCashTransactionFormSchema,
  type CashTransaction,
  type CashTransactionFormValues,
} from "../schemas/cash";

interface CashTransactionFormProps {
  activeSeason: Season | null;
  defaultValues?: CashTransaction | null;
  onSubmit: (values: CashTransactionFormValues) => void;
  isSubmitting?: boolean;
}

export function CashTransactionForm({
  activeSeason,
  defaultValues,
  onSubmit,
  isSubmitting,
}: CashTransactionFormProps) {
  const { t } = useTranslation();

  const { data: currenciesPage, isLoading: currenciesLoading } = useCurrencies({
    pageNumber: 1,
    pageSize: 50,
    isActive: "true",
    sortBy: "code",
    sortDirection: "asc",
  });

  const cashTransactionFormSchema = useMemo(() => createCashTransactionFormSchema(t), [t]);

  const currencyOptions = useMemo(
    () =>
      (currenciesPage?.items ?? []).map((c) => ({
        value: c.id,
        label: formatCurrencyLabel(c.code, c.name, t),
      })),
    [currenciesPage?.items, t],
  );

  const directionOptions = useMemo(
    () => [
      { value: "in", label: t("common:cash_in") },
      { value: "out", label: t("common:cash_out") },
    ],
    [t],
  );

  const form = useForm<CashTransactionFormValues>({
    resolver: zodResolver(cashTransactionFormSchema) as Resolver<CashTransactionFormValues>,
    defaultValues: {
      currencyId: defaultValues?.currencyId ?? "",
      direction: defaultValues?.direction ?? "in",
      amount: defaultValues?.amount ?? "",
      occurredAt:
        defaultValues?.occurredAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      notes: defaultValues?.notes ?? "",
    },
  });

  useEffect(() => {
    if (defaultValues?.currencyId || currenciesLoading || currencyOptions.length === 0) {
      return;
    }
    const current = form.getValues("currencyId");
    if (!current) {
      const usd = (currenciesPage?.items ?? []).find(
        (c) => c.code.trim().toUpperCase() === "USD",
      );
      form.setValue("currencyId", usd?.id ?? currencyOptions[0].value, {
        shouldValidate: true,
      });
    }
  }, [currenciesLoading, currencyOptions, currenciesPage?.items, defaultValues?.currencyId, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">{t("common:season")}</p>
          <p className="mt-1 text-base font-semibold">
            {activeSeason?.name || defaultValues?.seasonName || t("common:no_active_season")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("common:cash_season_hint")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DynamicLocalSelect
            name="currencyId"
            label={t("common:currency")}
            control={form.control}
            required
            options={currencyOptions}
            placeholder={t("common:select", { name: t("common:currency") })}
            disabled={currenciesLoading || currencyOptions.length === 0}
          />

          <DynamicLocalSelect
            name="direction"
            label={t("common:cash_direction")}
            control={form.control}
            required
            options={directionOptions}
          />

          <InputField
            name="amount"
            label={t("common:amount")}
            placeholder={t("common:enter", { name: t("common:amount") })}
            control={form.control}
            required
            type="number"
            characterRestriction="none"
          />

          <DatePickerField
            name="occurredAt"
            label={t("common:date")}
            control={form.control}
            required
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{t("common:notes")}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t("common:enter", { name: t("common:notes") })}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !activeSeason}>
            {isSubmitting ? t("common:saving") : t("common:save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
