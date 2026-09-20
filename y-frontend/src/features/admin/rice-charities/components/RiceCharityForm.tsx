import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useEffect, useMemo } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formatAvailableStockFromKg } from "@/utils/weightUnit";
import { useRiceWarehouseDashboard } from "../../rice-warehouses/hooks/useRiceWarehouseDashboard";
import type { Season } from "../../seasons/schemas/season";
import {
  createRiceCharityFormSchema,
  type RiceCharity,
  type RiceCharityFormValues,
} from "../schemas/rice-charity";

interface RiceCharityFormProps {
  activeSeason: Season | null;
  initialCharity?: RiceCharity | null;
  onSubmit: (values: RiceCharityFormValues) => void;
  isSubmitting?: boolean;
}

function charityToFormValues(charity: RiceCharity): RiceCharityFormValues {
  return {
    recipientName: charity.recipientName,
    riceVariety: charity.riceVariety,
    quantity: charity.quantity,
    unit: charity.unit as "seven_kg",
    charityDate: charity.charityDate.slice(0, 10),
    notes: charity.notes ?? "",
  };
}

const today = new Date().toISOString().slice(0, 10);

export function RiceCharityForm({
  activeSeason,
  initialCharity,
  onSubmit,
  isSubmitting,
}: RiceCharityFormProps) {
  const { t } = useTranslation();
  const { data: dashboard } = useRiceWarehouseDashboard();

  const riceCharityFormSchema = useMemo(() => createRiceCharityFormSchema(t), [t]);

  const varietyOptions = useMemo(() => {
    const rows = [...(dashboard?.varietyBreakdown ?? [])];

    if (
      initialCharity?.riceVariety &&
      !rows.some(
        (row) =>
          row.variety.trim().toLowerCase() ===
          initialCharity.riceVariety.trim().toLowerCase(),
      )
    ) {
      rows.push({
        variety: initialCharity.riceVariety,
        currentStockKg: "0",
      } as (typeof rows)[number]);
    }

    // Show every variety from the rice warehouse dashboard (including 0 / negative
    // book stock). Filtering to currentStockKg > 0 left the dropdown empty after oversell.
    return rows.map((v) => ({
      value: v.variety,
      label: `${v.variety} (${formatAvailableStockFromKg(v.currentStockKg, t)})`,
    }));
  }, [dashboard?.varietyBreakdown, initialCharity?.riceVariety, t]);

  const form = useForm<RiceCharityFormValues>({
    resolver: zodResolver(riceCharityFormSchema) as Resolver<RiceCharityFormValues>,
    defaultValues: {
      recipientName: "",
      riceVariety: "",
      quantity: "",
      unit: "seven_kg",
      charityDate: today,
      notes: "",
    },
  });

  useEffect(() => {
    if (initialCharity) {
      form.reset(charityToFormValues(initialCharity));
    }
  }, [initialCharity, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...form.register("unit")} />

        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t("common:rice_charity_section_details")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("common:rice_charity_no_payment_hint")}
            </p>
          </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputField
            name="recipientName"
            label={t("common:rice_charity_recipient")}
            placeholder={t("common:enter", { name: t("common:rice_charity_recipient") })}
            control={form.control}
            required
            characterRestriction="none"
          />

          <DatePickerField
            name="charityDate"
            label={t("common:date")}
            control={form.control}
            required
          />

          <div className="md:col-span-2">
            <DynamicLocalSelect
              name="riceVariety"
              label={t("common:rice_variety")}
              control={form.control}
              required
              options={varietyOptions}
              placeholder={t("common:select", { name: t("common:rice_variety") })}
              disabled={!dashboard?.season}
            />
          </div>

          <InputField
            name="quantity"
            label={t("common:quantity_seer")}
            placeholder={t("common:enter", { name: t("common:quantity_seer") })}
            control={form.control}
            required
            type="number"
            characterRestriction="none"
          />
        </div>

        <p className="text-xs text-muted-foreground">{t("common:rice_charity_bill_auto_hint")}</p>
        </section>

        <InputField
          name="notes"
          label={t("common:notes")}
          placeholder={t("common:enter", { name: t("common:notes") })}
          control={form.control}
          characterRestriction="none"
        />

        <div className="flex gap-3 border-t pt-4">
          <Button type="submit" disabled={isSubmitting || !activeSeason}>
            {isSubmitting
              ? t("common:saving", { name: t("admin:rice_charity") })
              : t("common:save", { name: t("admin:rice_charity") })}
          </Button>
          {!initialCharity ? (
            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isSubmitting}>
              {t("common:reset")}
            </Button>
          ) : null}
        </div>
      </form>
    </Form>
  );
}
