import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { APP_WEIGHT_UNIT, formatQuantityWithUnit } from "@/utils/weightUnit";
import type { Season } from "../../seasons/schemas/season";
import { useStoreProcessOptions } from "../hooks";
import {
  StoreStockFormSchema,
  type StoreStockFormValues,
  type StoreType,
} from "../schemas/store";

const STORE_BILL_PREFIX_MAP: Record<StoreType, string> = {
  short_green: "SG",
  regection: "RG",
  broken_rice: "BR",
  waste: "WS",
};

export type StoreLockedSourceProcess = {
  sourcePaddyProcessId: string;
  billNo: string;
  variety: string;
  date: string;
  weight: string;
  unit: string;
  ownerName: string;
  paddyWarehouseBillNo: string;
};

interface StoreEntryFormProps {
  activeSeason: Season | null;
  storeType: StoreType;
  onSubmit: (values: StoreStockFormValues) => void;
  isSubmitting?: boolean;
  initialSourcePaddyProcessId?: string;
  lockSourceSelection?: boolean;
  lockedSourceProcess?: StoreLockedSourceProcess | null;
}

export function StoreEntryForm({
  activeSeason,
  storeType,
  onSubmit,
  isSubmitting,
  initialSourcePaddyProcessId,
  lockSourceSelection = false,
  lockedSourceProcess = null,
}: StoreEntryFormProps) {
  const { t } = useTranslation();
  const generatedBillPreview = `${activeSeason?.code?.trim().toUpperCase() || "SEASON"}-${
    STORE_BILL_PREFIX_MAP[storeType]
  }-*`;

  const form = useForm<StoreStockFormValues>({
    resolver: zodResolver(StoreStockFormSchema) as any,
    defaultValues: {
      storeType,
      sourcePaddyProcessId: initialSourcePaddyProcessId || "",
      billNo: "",
      date: "",
      variety: "",
      weight: "",
      unit: APP_WEIGHT_UNIT,
      ownerName: "",
      paddyWarehouseBillNo: "",
    },
  });

  const selectedSourceId = useWatch({
    control: form.control,
    name: "sourcePaddyProcessId",
  });
  const { data: processOptions, isLoading } = useStoreProcessOptions({
    seasonId: activeSeason?.id,
    storeType,
  });

  const sourceOptions = (processOptions?.sources ?? []).map((source) => ({
    value: source.sourcePaddyProcessId,
    label: `${source.billNo} - ${source.ownerName} - ${formatQuantityWithUnit(source.weight, source.unit, t)}`,
  }));

  const selectedSource = useMemo(() => {
    const fromOptions = (processOptions?.sources ?? []).find(
      (source) => source.sourcePaddyProcessId === selectedSourceId,
    );
    if (fromOptions) {
      return fromOptions;
    }

    if (
      lockedSourceProcess &&
      lockedSourceProcess.sourcePaddyProcessId === selectedSourceId
    ) {
      return lockedSourceProcess;
    }

    return null;
  }, [lockedSourceProcess, processOptions?.sources, selectedSourceId]);

  useEffect(() => {
    form.setValue("storeType", storeType);
  }, [form, storeType]);

  useEffect(() => {
    form.setValue("sourcePaddyProcessId", initialSourcePaddyProcessId || "");
  }, [form, initialSourcePaddyProcessId]);

  useEffect(() => {
    form.setValue("billNo", generatedBillPreview);
  }, [form, generatedBillPreview]);

  useEffect(() => {
    if (!selectedSource) {
      return;
    }

    form.setValue("date", selectedSource.date?.slice(0, 10) || "");
    form.setValue("variety", selectedSource.variety || "");
    form.setValue("unit", APP_WEIGHT_UNIT);
    form.setValue("ownerName", selectedSource.ownerName || "");
    form.setValue(
      "paddyWarehouseBillNo",
      selectedSource.paddyWarehouseBillNo || "",
    );
  }, [form, selectedSource]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...form.register("unit")} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DynamicLocalSelect
            name="sourcePaddyProcessId"
            label={t("common:processed_bill_no")}
            control={form.control}
            required
            options={sourceOptions}
            placeholder={t("common:select", { name: t("common:processed_bill_no") })}
            disabled={lockSourceSelection}
          />

          <InputField
            name="billNo"
            label={t("common:store_entry_bill_no")}
            control={form.control}
            disabled
            placeholder={generatedBillPreview}
          />

          <DatePickerField name="date" label={t("common:date")} control={form.control} disabled />

          <InputField name="variety" label={t("common:variety")} control={form.control} disabled />

          <InputField
            name="weight"
            label={t("common:quantity_seer")}
            control={form.control}
            required
            type="number"
            characterRestriction="none"
            placeholder={
              selectedSource
                ? t("common:store_weight_max_hint", {
                    weight: selectedSource.weight,
                    unit: t("common:seven_kg"),
                  })
                : undefined
            }
          />

          <InputField
            name="ownerName"
            label={t("common:owner_name")}
            control={form.control}
            disabled
          />

          <InputField
            name="paddyWarehouseBillNo"
            label={t("common:warehouse_bill_no")}
            control={form.control}
            disabled
          />
        </div>

        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-sm font-medium">{t("common:store_form_source_hint_title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? t("common:loading", { name: t("common:processed_bill_no") })
              : t("common:store_stock_form_hint")}
          </p>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting || !activeSeason || !selectedSource}>
            {isSubmitting
              ? t("common:saving", { name: t("common:stock") })
              : t("common:save", { name: t("common:stock") })}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              form.reset({
                storeType,
                sourcePaddyProcessId: initialSourcePaddyProcessId || "",
                billNo: generatedBillPreview,
                date: selectedSource?.date?.slice(0, 10) || "",
                variety: selectedSource?.variety || "",
                weight: "",
                unit: APP_WEIGHT_UNIT,
                ownerName: selectedSource?.ownerName || "",
                paddyWarehouseBillNo: selectedSource?.paddyWarehouseBillNo || "",
              })
            }
            disabled={isSubmitting}
          >
            {t("common:reset")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
