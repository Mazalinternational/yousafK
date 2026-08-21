import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useEffect, useMemo } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formatWeightFromKg, quantityInputFromRecord } from "@/utils/weightUnit";
import type { Season } from "../../seasons/schemas/season";
import { usePaddyProcessAllStoreAvailability } from "../hooks/usePaddyProcessStoreAvailability";
import {
  createPaddyProcessFromStoreFormSchema,
  PADDY_PROCESS_FROM_STORE_TYPES,
  type PaddyProcess,
  type PaddyProcessFromStoreFormValues,
} from "../schemas/paddy-process";

interface PaddyProcessFromStoreFormProps {
  activeSeason: Season | null;
  defaultValues: PaddyProcess | null;
  onSubmit: (values: PaddyProcessFromStoreFormValues) => void;
  isSubmitting?: boolean;
}

const STORE_SOURCE_OPTIONS = PADDY_PROCESS_FROM_STORE_TYPES.map((value) => ({
  value,
  labelKey: value as "short_green" | "regection" | "broken_rice",
}));

export function PaddyProcessFromStoreForm({
  activeSeason,
  defaultValues,
  onSubmit,
  isSubmitting,
}: PaddyProcessFromStoreFormProps) {
  const { t } = useTranslation();
  const seasonId = activeSeason?.id || defaultValues?.seasonId;
  const generatedBillPreview =
    defaultValues?.billNo || `${activeSeason?.code?.trim().toUpperCase() || "SEASON"}-PP-*`;

  const formSchema = useMemo(() => createPaddyProcessFromStoreFormSchema(t), [t]);

  const isStoreSource = defaultValues
    ? PADDY_PROCESS_FROM_STORE_TYPES.includes(
        defaultValues.stockSourceType as (typeof PADDY_PROCESS_FROM_STORE_TYPES)[number],
      )
    : false;

  const form = useForm<PaddyProcessFromStoreFormValues>({
    resolver: zodResolver(formSchema) as Resolver<PaddyProcessFromStoreFormValues>,
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      stockSourceType:
        isStoreSource && defaultValues
          ? (defaultValues.stockSourceType as PaddyProcessFromStoreFormValues["stockSourceType"])
          : "short_green",
      billNo: defaultValues?.billNo || "",
      date: defaultValues?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      weight: defaultValues
        ? quantityInputFromRecord(defaultValues.weight, defaultValues.unit)
        : "",
      unit: "seven_kg",
    },
  });

  const selectedStoreType =
    useWatch({ control: form.control, name: "stockSourceType" }) || "short_green";

  const { stockByType, isLoading: isLoadingAvailability } =
    usePaddyProcessAllStoreAvailability({
      seasonId,
      excludeId: defaultValues?.id,
    });

  const storeSourceOptions = useMemo(
    () =>
      STORE_SOURCE_OPTIONS.map((option) => ({
        value: option.value,
        label: t(`common:${option.labelKey}`),
      })),
    [t],
  );

  const selectedStockAvailableKg = stockByType[selectedStoreType] ?? 0;

  useEffect(() => {
    if (defaultValues) {
      return;
    }

    form.setValue("weight", "");
    form.clearErrors(["weight"]);
  }, [defaultValues, form, selectedStoreType]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...form.register("unit")} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DynamicLocalSelect
            name="stockSourceType"
            label={t("common:store_type")}
            control={form.control}
            required
            options={storeSourceOptions}
            placeholder={t("common:select", { name: t("common:store_type") })}
            disabled={Boolean(defaultValues)}
          />

          <InputField
            name="billNo"
            label={t("common:process_bill_no")}
            control={form.control}
            disabled
            placeholder={generatedBillPreview}
          />

          <DatePickerField
            name="date"
            label={t("common:date")}
            control={form.control}
            required
            disabled={Boolean(defaultValues)}
          />

          <InputField
            name="weight"
            label={t("common:quantity_seer")}
            control={form.control}
            required
            type="number"
            characterRestriction="none"
          />
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium">{t("common:store_stock_by_type")}</p>
          {isLoadingAvailability ? (
            <p className="text-base font-semibold">
              {t("common:loading", { name: t("common:available_store_stock") })}
            </p>
          ) : (
            <div className="space-y-1 text-sm">
              {STORE_SOURCE_OPTIONS.map(({ value, labelKey }) => (
                <p key={value}>
                  <span className="text-muted-foreground">{t(`common:${labelKey}`)}: </span>
                  <span
                    className={
                      value === selectedStoreType ? "font-semibold" : "font-medium"
                    }
                  >
                    {formatWeightFromKg(stockByType[value] ?? 0, t)}
                  </span>
                </p>
              ))}
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{t("common:available_store_stock")}</p>
            <p className="mt-1 text-base font-semibold">
              {isLoadingAvailability
                ? t("common:loading", { name: t("common:available_store_stock") })
                : formatWeightFromKg(selectedStockAvailableKg, t)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("common:store_type")}: {t(`common:${selectedStoreType}`)}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              (!activeSeason && !defaultValues) ||
              (!defaultValues && selectedStockAvailableKg <= 0)
            }
          >
            {isSubmitting
              ? t("common:saving", { name: t("admin:paddy_process") })
              : t("common:save", { name: t("admin:paddy_process") })}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isSubmitting}
          >
            {t("common:reset")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
