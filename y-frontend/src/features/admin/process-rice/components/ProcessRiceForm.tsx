import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useEffect, useMemo } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formatQuantityWithUnit } from "@/utils/weightUnit";
import type { Season } from "../../seasons/schemas/season";
import { useVarietySelectOptions } from "../../verieties/hooks";
import { useProcessRiceOptions } from "../hooks";
import {
  createProcessRiceFormSchema,
  type ProcessRice,
  type ProcessRiceFormValues,
} from "../schemas/process-rice";

interface ProcessRiceSourcePreview {
  billNo: string;
  variety: string;
  date: string;
}

interface ProcessRiceFormProps {
  activeSeason: Season | null;
  defaultValues: ProcessRice | null;
  onSubmit: (values: ProcessRiceFormValues) => void;
  isSubmitting?: boolean;
  initialSourcePaddyProcessId?: string;
  lockSourceSelection?: boolean;
  compactFromProcess?: boolean;
  sourcePreview?: ProcessRiceSourcePreview;
}

export function ProcessRiceForm({
  activeSeason,
  defaultValues,
  onSubmit,
  isSubmitting,
  initialSourcePaddyProcessId,
  lockSourceSelection = false,
  compactFromProcess = false,
  sourcePreview,
}: ProcessRiceFormProps) {
  const { t } = useTranslation();
  const seasonId = activeSeason?.id || defaultValues?.seasonId;
  const generatedBillPreview =
    defaultValues?.billNo || `${activeSeason?.code?.trim().toUpperCase() || "SEASON"}-PR-*`;

  const {
    options: riceVarietyOptions,
    isLoading: riceVarietiesLoading,
    isEmpty: noRiceVarieties,
  } = useVarietySelectOptions("RICE");

  const formSchema = useMemo(() => createProcessRiceFormSchema(t), [t]);

  const form = useForm<ProcessRiceFormValues>({
    resolver: zodResolver(formSchema) as Resolver<ProcessRiceFormValues>,
    defaultValues: {
      sourcePaddyProcessId:
        initialSourcePaddyProcessId || defaultValues?.sourcePaddyProcessId || "",
      processedBillNo: defaultValues?.processedBillNo || "",
      billNo: defaultValues?.billNo || "",
      date: defaultValues?.date?.slice(0, 10) || "",
      riceVariety: defaultValues?.variety || "",
      weight: defaultValues
        ? String(defaultValues.weight)
        : "",
      unit: "seven_kg",
    },
  });

  const selectedSourceId = useWatch({ control: form.control, name: "sourcePaddyProcessId" }) || "";
  const { data: options } = useProcessRiceOptions({
    seasonId,
    excludeId: defaultValues?.id,
  });
  const selectedSourceFromOptions = (options?.sources ?? []).find(
    (source) => source.sourcePaddyProcessId === selectedSourceId,
  );
  const selectedSource = selectedSourceFromOptions
    ? selectedSourceFromOptions
    : sourcePreview && selectedSourceId
      ? {
          sourcePaddyProcessId: selectedSourceId,
          billNo: sourcePreview.billNo,
          variety: sourcePreview.variety,
          date: sourcePreview.date,
          weight: "0",
          unit: "seven_kg" as const,
          processedWeightKg: "0",
        }
      : defaultValues?.sourcePaddyProcess
        ? {
            sourcePaddyProcessId: defaultValues.sourcePaddyProcess.id,
            billNo: defaultValues.sourcePaddyProcess.billNo,
            variety: defaultValues.sourcePaddyProcess.variety,
            date: defaultValues.sourcePaddyProcess.date,
            weight: defaultValues.sourcePaddyProcess.weight,
            unit: defaultValues.sourcePaddyProcess.unit,
            processedWeightKg: defaultValues.sourcePaddyProcess.processedWeightKg,
          }
        : null;

  const sourceOptions = (options?.sources ?? []).map((source) => ({
    value: source.sourcePaddyProcessId,
    label: `${source.billNo} - ${source.variety} - ${formatQuantityWithUnit(source.weight, source.unit, t)}`,
  }));

  useEffect(() => {
    form.setValue(
      "sourcePaddyProcessId",
      initialSourcePaddyProcessId || defaultValues?.sourcePaddyProcessId || "",
    );
  }, [form, initialSourcePaddyProcessId, defaultValues?.sourcePaddyProcessId]);

  useEffect(() => {
    if (!selectedSource) {
      return;
    }
    form.setValue("processedBillNo", selectedSource.billNo);
    form.setValue("date", selectedSource.date.slice(0, 10));
    form.setValue("unit", "seven_kg");

    // If not editing an existing entry, default to the source's variety.
    // Users can override it via the dropdown.
    if (!defaultValues?.id && selectedSource.variety) {
      form.setValue("riceVariety", selectedSource.variety, {
        shouldValidate: true,
        shouldDirty: false,
      });
    }
  }, [form, selectedSource]);

  const showFullForm = !compactFromProcess;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...form.register("sourcePaddyProcessId")} />
        <input type="hidden" {...form.register("unit")} />
        <input type="hidden" {...form.register("processedBillNo")} />
        <input type="hidden" {...form.register("date")} />

        {compactFromProcess && selectedSource ? (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <p className="text-sm">
              <span className="font-medium">{t("common:processed_bill_no")}: </span>
              {selectedSource.billNo}
            </p>
            <DynamicLocalSelect
              name="riceVariety"
              label={t("common:rice_variety")}
              control={form.control}
              required
              options={riceVarietyOptions}
              placeholder={t("common:select", { name: t("common:rice_variety") })}
              disabled={riceVarietiesLoading || noRiceVarieties}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {showFullForm ? (
            <>
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
                label={t("common:rice_bill_no")}
                control={form.control}
                disabled
                placeholder={generatedBillPreview}
              />

              <DatePickerField
                name="date"
                label={t("common:date")}
                control={form.control}
                disabled
              />

              <DynamicLocalSelect
                name="riceVariety"
                label={t("common:rice_variety")}
                control={form.control}
                required
                options={riceVarietyOptions}
                placeholder={t("common:select", { name: t("common:rice_variety") })}
                disabled={riceVarietiesLoading || noRiceVarieties}
              />
            </>
          ) : null}

          <InputField
            name="weight"
            label={t("common:quantity_seer")}
            control={form.control}
            required
            type="number"
            characterRestriction="none"
            className={showFullForm ? undefined : "md:col-span-2"}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting || !activeSeason || !selectedSource}>
            {isSubmitting
              ? t("common:saving", { name: t("admin:process_rice") })
              : t("common:save", { name: t("admin:process_rice") })}
          </Button>
          {showFullForm ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                form.reset({
                  sourcePaddyProcessId:
                    initialSourcePaddyProcessId || defaultValues?.sourcePaddyProcessId || "",
                  processedBillNo: selectedSource?.billNo || "",
                  billNo: generatedBillPreview,
                  date: selectedSource?.date?.slice(0, 10) || "",
                  weight: "",
                  unit: "seven_kg",
                })
              }
              disabled={isSubmitting}
            >
              {t("common:reset")}
            </Button>
          ) : null}
        </div>
      </form>
    </Form>
  );
}
