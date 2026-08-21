import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formatWeightFromKg, quantityInputFromRecord } from "@/utils/weightUnit";
import type { Season } from "../../seasons/schemas/season";
import { useEnteringPaddies } from "../../entering-paddy/hooks/useEnteringPaddies";
import { useVarietySelectOptions } from "../../verieties/hooks";
import {
  createFarmerOwnedPaddyWarehouseFormSchema,
  type FarmerOwnedPaddyWarehouse,
  type FarmerOwnedPaddyWarehouseFormValues,
} from "../schemas/farmer-owned-paddy-warehouse";

type FarmerOwnedPaddyWarehouseFormProps = {
  activeSeason: Season | null;
  defaultValues: FarmerOwnedPaddyWarehouse | null;
  onSubmit: (values: FarmerOwnedPaddyWarehouseFormValues) => void;
  isSubmitting?: boolean;
};

export function FarmerOwnedPaddyWarehouseForm({
  activeSeason,
  defaultValues,
  onSubmit,
  isSubmitting,
}: FarmerOwnedPaddyWarehouseFormProps) {
  const { t } = useTranslation();
  const seasonId = activeSeason?.id ?? defaultValues?.seasonId ?? "";
  const {
    options: paddyVarietyOptions,
    isLoading: paddyVarietiesLoading,
    isEmpty: noPaddyVarieties,
  } = useVarietySelectOptions("PADDY");
  const {
    options: riceVarietyOptions,
    isLoading: riceVarietiesLoading,
    isEmpty: noRiceVarieties,
  } = useVarietySelectOptions("RICE");
  const generatedBillPreview = defaultValues?.billNo
    || `${activeSeason?.code?.trim().toUpperCase() || "SEASON"}-FPW-*`;
  const { data: enteringPaddies } = useEnteringPaddies({
    pageNumber: 1,
    pageSize: 1000,
    seasonId,
    receivedFrom: "farmer",
    trackedInWarehouse: false,
  });
  const enteringOptions = (enteringPaddies?.items ?? []).map((entry) => ({
    value: entry.id,
    label: `${entry.billNo} - ${entry.paddyOwner} - ${entry.variety} - ${formatWeightFromKg(entry.totalWeightKg, t)}`,
  }));

  const formSchema = useMemo(() => createFarmerOwnedPaddyWarehouseFormSchema(t), [t]);

  const form = useForm<FarmerOwnedPaddyWarehouseFormValues>({
    resolver: zodResolver(formSchema) as Resolver<FarmerOwnedPaddyWarehouseFormValues>,
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      enteringPaddyId: defaultValues?.enteringPaddyId || "",
      billNo: defaultValues?.billNo || "",
      enteringBillNo: defaultValues?.enteringBillNo || "",
      paddyVariety: defaultValues?.paddyVariety || "",
      paddyQuantity: defaultValues
        ? quantityInputFromRecord(defaultValues.paddyQuantity, defaultValues.unit)
        : "",
      riceVariety: defaultValues?.riceVariety || "",
      riceQuantity: defaultValues
        ? quantityInputFromRecord(defaultValues.riceQuantity, defaultValues.unit)
        : "",
      unit: "seven_kg",
      ownerName: defaultValues?.ownerName || "",
      receivedDate: defaultValues?.receivedDate?.slice(0, 10) || "",
      notes: defaultValues?.notes || "",
    },
  });

  const enteringPaddyId = useWatch({ control: form.control, name: "enteringPaddyId" }) || "";
  const selectedEnteringPaddy =
    (enteringPaddies?.items ?? []).find((item) => item.id === enteringPaddyId) ||
    null;
  const isLinkedToEntering = Boolean(selectedEnteringPaddy || defaultValues?.enteringPaddyId);
  const forceSourceDriven = !defaultValues || isLinkedToEntering;
  const requiresSourceSelection = !defaultValues && !selectedEnteringPaddy;

  useEffect(() => {
    if (!selectedEnteringPaddy) {
      return;
    }

    form.setValue("paddyVariety", selectedEnteringPaddy.variety, { shouldValidate: true });
    form.setValue("enteringBillNo", selectedEnteringPaddy.billNo, { shouldValidate: true });
    form.setValue("paddyQuantity", selectedEnteringPaddy.weight, { shouldValidate: true });
    form.setValue("unit", "seven_kg", { shouldValidate: true });
    form.setValue("ownerName", selectedEnteringPaddy.paddyOwner, { shouldValidate: true });
    form.setValue("receivedDate", selectedEnteringPaddy.date.slice(0, 10), { shouldValidate: true });
  }, [form, selectedEnteringPaddy]);

  useEffect(() => {
    if (paddyVarietiesLoading || paddyVarietyOptions.length === 0 || forceSourceDriven) {
      return;
    }
    const current = form.getValues("paddyVariety");
    if (!current || !paddyVarietyOptions.some((o) => o.value === current)) {
      form.setValue("paddyVariety", paddyVarietyOptions[0].value, { shouldValidate: true });
    }
  }, [paddyVarietiesLoading, paddyVarietyOptions, form, forceSourceDriven]);

  useEffect(() => {
    if (riceVarietiesLoading || riceVarietyOptions.length === 0) {
      return;
    }
    const current = form.getValues("riceVariety");
    if (!current || !riceVarietyOptions.some((o) => o.value === current)) {
      form.setValue("riceVariety", riceVarietyOptions[0].value, { shouldValidate: true });
    }
  }, [riceVarietiesLoading, riceVarietyOptions, form]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit as any)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <input type="hidden" {...form.register("unit")} />

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pe-1">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 px-2 py-1">
            <p className="text-sm font-medium">{t("common:stock_type")}</p>
            <p className="mt-1 text-sm font-semibold">{t("common:farmer_owned")}</p>
          </div>

          <div className="rounded-lg border bg-muted/30 px-2 py-1">
            <p className="text-sm font-medium">{t("common:season")}</p>
            <p className="mt-1 text-sm font-semibold">
              {activeSeason?.name || defaultValues?.seasonName || t("common:no_active_season")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DynamicLocalSelect
            name="enteringPaddyId"
            label={t("common:entering_paddy_source")}
            control={form.control as any}
            options={enteringOptions}
            placeholder={t("common:select", { name: t("common:entering_paddy_source") })}
            disabled={Boolean(defaultValues?.enteringPaddyId)}
          />

          <DynamicLocalSelect
            name="paddyVariety"
            label={t("common:paddy_variety")}
            control={form.control as any}
            required
            options={paddyVarietyOptions}
            placeholder={t("common:select", { name: t("common:paddy_variety") })}
            disabled={
              forceSourceDriven ||
              (!forceSourceDriven && (paddyVarietiesLoading || noPaddyVarieties))
            }
          />

          <InputField
            name="billNo"
            label={t("common:warehouse_bill_no")}
            control={form.control as any}
            disabled
            placeholder={generatedBillPreview}
          />

          <InputField
            name="enteringBillNo"
            label={t("common:entering_bill_no")}
            control={form.control as any}
            disabled
            placeholder={t("common:auto_filled_from_entering")}
          />

          <DatePickerField
            name="receivedDate"
            label={t("common:received_date")}
            control={form.control as any}
            required
            disabled={forceSourceDriven}
          />

          <InputField
            name="ownerName"
            label={t("common:owner_name")}
            placeholder={t("common:enter", { name: t("common:owner_name") })}
            control={form.control as any}
            required
            characterRestriction="none"
            disabled={forceSourceDriven}
          />

          <DynamicLocalSelect
            name="riceVariety"
            label={t("common:rice_variety")}
            control={form.control as any}
            required
            options={riceVarietyOptions}
            placeholder={t("common:select", { name: t("common:rice_variety") })}
            disabled={riceVarietiesLoading || noRiceVarieties}
          />

          <InputField
            name="paddyQuantity"
            label={t("common:quantity_seer")}
            placeholder={t("common:enter", { name: t("common:paddy_quantity") })}
            control={form.control as any}
            required
            type="number"
            characterRestriction="none"
            disabled={forceSourceDriven}
          />

          <InputField
            name="riceQuantity"
            label={t("common:quantity_seer")}
            placeholder={t("common:enter", { name: t("common:rice_quantity") })}
            control={form.control as any}
            required
            type="number"
            characterRestriction="none"
          />

          <InputField
            name="notes"
            label={t("common:notes")}
            placeholder={t("common:enter", { name: t("common:notes") })}
            control={form.control as any}
            characterRestriction="none"
            className="md:col-span-2"
          />
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-medium">{t("common:farmer_owned_rice_ledger_hint_title")}</p>
          <p className="mt-1 text-blue-800">{t("common:farmer_owned_rice_ledger_hint")}</p>
        </div>

        {/* {selectedEnteringPaddy ? (
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            {t("common:warehouse_tracking_hint", {
              billNo: selectedEnteringPaddy.billNo,
              owner: selectedEnteringPaddy.paddyOwner,
            })}
          </div>
        ) : null}

        <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-700">
          {t("common:warehouse_bill_type_hint", {
            warehouseBillPrefix: `${activeSeason?.code?.trim().toUpperCase() || "SEASON"}-FPW`,
            enteringBillPrefix: `${activeSeason?.code?.trim().toUpperCase() || "SEASON"}-EPF`,
          })}
        </div> */}

        {/* {requiresSourceSelection ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {t("common:select_entering_paddy_required_hint")}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-2">
            <p className="text-sm text-muted-foreground">{t("common:paddy_quantity")}</p>
            <p className="mt-1 text-md font-semibold">
              {formatPreviewAmount(paddyQuantity)} {t(`common:${unit}`)}
            </p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-sm text-muted-foreground">{t("common:rice_quantity")}</p>
            <p className="mt-1 text-md font-semibold">
              {formatPreviewAmount(riceQuantity)} {t(`common:${unit}`)}
            </p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-sm text-muted-foreground">{t("common:exchange_difference")}</p>
            <p className="mt-1 text-md font-semibold">
              {formatPreviewAmount(difference)} {t(`common:${unit}`)}
            </p>
          </div>
        </div> */}
        </div>

        <div className="mt-4 flex shrink-0 gap-3 border-t pt-4">
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              (!activeSeason && !defaultValues) ||
              requiresSourceSelection ||
              riceVarietiesLoading ||
              noRiceVarieties ||
              paddyVarietiesLoading ||
              (!forceSourceDriven && noPaddyVarieties)
            }
          >
            {isSubmitting
              ? t("common:saving", { name: t("admin:farmer_owned_paddy_warehouse") })
              : t("common:save", { name: t("admin:farmer_owned_paddy_warehouse") })}
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
