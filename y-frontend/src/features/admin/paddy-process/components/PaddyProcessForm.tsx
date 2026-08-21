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
import { useVarietySelectOptions } from "../../verieties/hooks";
import { usePaddyProcessAvailability } from "../hooks";
import {
  createPaddyProcessFormSchema,
  type PaddyProcess,
  type PaddyProcessFormValues,
} from "../schemas/paddy-process";

interface PaddyProcessFormProps {
  activeSeason: Season | null;
  defaultValues: PaddyProcess | null;
  onSubmit: (values: PaddyProcessFormValues) => void;
  isSubmitting?: boolean;
}

const STOCK_SOURCE_OPTIONS = [
  { value: "company", labelKey: "company_owned" as const },
  { value: "farmer", labelKey: "farmer_owned" as const },
];

export function PaddyProcessForm({
  activeSeason,
  defaultValues,
  onSubmit,
  isSubmitting,
}: PaddyProcessFormProps) {
  const { t } = useTranslation();
  const seasonId = activeSeason?.id || defaultValues?.seasonId;
  const generatedBillPreview =
    defaultValues?.billNo || `${activeSeason?.code?.trim().toUpperCase() || "SEASON"}-PP-*`;
  const {
    options: varietyOptions,
    isLoading: varietiesLoading,
    isEmpty: noPaddyVarieties,
  } = useVarietySelectOptions("PADDY");

  const formSchema = useMemo(() => createPaddyProcessFormSchema(t), [t]);

  const form = useForm<PaddyProcessFormValues>({
    resolver: zodResolver(formSchema) as Resolver<PaddyProcessFormValues>,
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      stockSourceType: defaultValues?.stockSourceType || "company",
      billNo: defaultValues?.billNo || "",
      variety: defaultValues?.variety || "",
      date: defaultValues?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      weight: defaultValues
        ? quantityInputFromRecord(defaultValues.weight, defaultValues.unit)
        : "",
      unit: "seven_kg",
    },
  });

  const selectedVariety = useWatch({ control: form.control, name: "variety" }) || "";
  const selectedStockSourceType =
    useWatch({ control: form.control, name: "stockSourceType" }) || "company";
  const { data: availability, isLoading: isLoadingAvailability } = usePaddyProcessAvailability({
    seasonId,
    variety: selectedVariety || undefined,
    excludeId: defaultValues?.id,
  });

  const stockSourceOptions = useMemo(
    () =>
      STOCK_SOURCE_OPTIONS.map((option) => ({
        value: option.value,
        label: t(`common:${option.labelKey}`),
      })),
    [t],
  );

  const selectedStockAvailableKg = useMemo(() => {
    if (!availability || !selectedVariety) {
      return 0;
    }

    return Number(
      selectedStockSourceType === "farmer"
        ? (availability.varietyFarmerStockAvailableKg ?? 0)
        : (availability.varietyCompanyStockAvailableKg ?? 0),
    );
  }, [availability, selectedStockSourceType, selectedVariety]);

  useEffect(() => {
    if (defaultValues) {
      return;
    }

    form.setValue("weight", "");
    form.clearErrors(["weight"]);
  }, [defaultValues, form, selectedVariety, selectedStockSourceType]);

  useEffect(() => {
    if (defaultValues || varietiesLoading || varietyOptions.length === 0) {
      return;
    }
    const current = form.getValues("variety");
    if (!current || !varietyOptions.some((o) => o.value === current)) {
      form.setValue("variety", varietyOptions[0].value);
    }
  }, [defaultValues, varietiesLoading, varietyOptions, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...form.register("unit")} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DynamicLocalSelect
            name="variety"
            label={t("common:variety")}
            control={form.control}
            required
            options={varietyOptions}
            placeholder={t("common:select", { name: t("common:variety") })}
            disabled={Boolean(defaultValues) || varietiesLoading || noPaddyVarieties}
          />

          <DynamicLocalSelect
            name="stockSourceType"
            label={t("common:stock_type")}
            control={form.control}
            required
            options={stockSourceOptions}
            placeholder={t("common:select", { name: t("common:stock_type") })}
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

        <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
          <div>
            <p className="text-sm font-medium">
              {t("common:paddy_current_stock_by_variety")}
            </p>
            {isLoadingAvailability || !selectedVariety ? (
              <p className="mt-1 text-base font-semibold">
                {t("common:loading", { name: t("common:available_paddy_stock") })}
              </p>
            ) : (
              <div className="mt-1 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">{t("common:company_owned")}: </span>
                  <span className="font-semibold">
                    {formatWeightFromKg(
                      Number(availability?.varietyCompanyStockAvailableKg ?? 0),
                      t,
                    )}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">{t("common:farmer_owned")}: </span>
                  <span className="font-semibold">
                    {formatWeightFromKg(
                      Number(availability?.varietyFarmerStockAvailableKg ?? 0),
                      t,
                    )}
                  </span>
                </p>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium">{t("common:available_paddy_stock")}</p>
            <p className="mt-1 text-base font-semibold">
              {isLoadingAvailability || !selectedVariety
                ? t("common:loading", { name: t("common:available_paddy_stock") })
                : formatWeightFromKg(selectedStockAvailableKg, t)}
            </p>
            {selectedVariety ? (
              <p className="text-xs text-muted-foreground">
                {t("common:stock_type")}:{" "}
                {selectedStockSourceType === "farmer"
                  ? t("common:farmer_owned")
                  : t("common:company_owned")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              (!activeSeason && !defaultValues) ||
              varietiesLoading ||
              noPaddyVarieties ||
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
