import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formatDisplayAmount, getDisplayLocale } from "@/utils/displayLocale";
import { formatWeightFromKg, quantityInputFromRecord } from "@/utils/weightUnit";
import type { Season } from "../../seasons/schemas/season";
import { useCurrencies } from "../../currencies/hooks/useCurrencies";
import { useEnteringPaddies } from "../../entering-paddy/hooks/useEnteringPaddies";
import { useSarafs } from "../../sarafi/hooks/useSarafs";
import { useVarietySelectOptions } from "../../verieties/hooks";
import {
  COMPANY_PADDY_SELLER_PAYMENT_ROUTE,
  PADDY_PAYMENT_TYPE_OPTIONS,
  createPaddyWarehouseFormSchema,
  type PaddyWarehouse,
  type PaddyWarehouseFormValues,
} from "../schemas/paddy-warehouse";

interface PaddyWarehouseFormProps {
  activeSeason: Season | null;
  defaultValues: PaddyWarehouse | null;
  onSubmit: (values: PaddyWarehouseFormValues) => void;
  isSubmitting?: boolean;
}


export function PaddyWarehouseForm({
  activeSeason,
  defaultValues,
  onSubmit,
  isSubmitting,
}: PaddyWarehouseFormProps) {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const {
    options: varietyOptions,
    isLoading: varietiesLoading,
    isEmpty: noPaddyVarieties,
  } = useVarietySelectOptions("PADDY");
  const paymentTypeOptions = PADDY_PAYMENT_TYPE_OPTIONS.map((paymentType) => ({
    value: paymentType,
    label: t(`common:${paymentType}`),
  }));
  const paymentRouteOptions = COMPANY_PADDY_SELLER_PAYMENT_ROUTE.map((route) => ({
    value: route,
    label:
      route === "cash" ? t("common:jwali_paid_by_cash") : t("common:jwali_paid_by_saraf"),
  }));
  const seasonId = activeSeason?.id || defaultValues?.seasonId;
  const { data: sarafsData } = useSarafs({
    pageNumber: 1,
    pageSize: 500,
    seasonId,
    sortBy: "name",
    sortDirection: "asc",
  });
  const { data: currenciesData, isLoading: currenciesLoading } = useCurrencies({
    pageNumber: 1,
    pageSize: 200,
    isActive: "true",
    sortBy: "code",
    sortDirection: "asc",
  });
  const sarafOptions = (sarafsData?.items ?? []).map((s) => ({
    value: s.id,
    label: `${s.name} — ${s.phoneNo}`,
  }));
  const currencyOptions = (currenciesData?.items ?? []).map((c) => ({
    value: c.id,
    label: `${c.code} — ${c.name}`,
  }));
  const generatedBillPreview = defaultValues?.billNo
    || `${activeSeason?.code?.trim().toUpperCase() || "SEASON"}-CPW-*`;
  const { data: enteringPaddies } = useEnteringPaddies({
    pageNumber: 1,
    pageSize: 1000,
    seasonId,
    receivedFrom: "seller",
    trackedInWarehouse: false,
  });
  const enteringOptions = (enteringPaddies?.items ?? []).map((entry) => ({
    value: entry.id,
    label: `${entry.billNo} - ${entry.paddyOwner} - ${entry.variety} - ${formatWeightFromKg(entry.totalWeightKg, t)}`,
  }));

  const formSchema = useMemo(() => createPaddyWarehouseFormSchema(t), [t]);

  const form = useForm<PaddyWarehouseFormValues>({
    resolver: zodResolver(formSchema) as Resolver<PaddyWarehouseFormValues>,
    defaultValues: {
      enteringPaddyId: defaultValues?.enteringPaddyId || "",
      billNo: defaultValues?.billNo || "",
      enteringBillNo: defaultValues?.enteringBillNo || "",
      variety: defaultValues?.variety || "",
      quantity: defaultValues
        ? quantityInputFromRecord(defaultValues.quantity, defaultValues.unit)
        : "",
      unit: "seven_kg",
      ownerName: defaultValues?.ownerName || "",
      rate: defaultValues?.rate || "",
      paymentType: defaultValues?.paymentType ?? "paid",
      paidAmount: defaultValues?.paidAmount || "0",
      paymentChannel: defaultValues?.paymentChannel || "cash",
      sarafId: defaultValues?.sarafId || "",
      sarafLedgerCurrencyId: defaultValues?.sarafLedgerCurrencyId || "",
      receivedDate: defaultValues?.receivedDate?.slice(0, 10) || "",
      notes: defaultValues?.notes || "",
    },
  });

  const paymentType = useWatch({ control: form.control, name: "paymentType" }) || "";
  const paymentChannel = useWatch({ control: form.control, name: "paymentChannel" }) || "cash";
  const quantityStr = useWatch({ control: form.control, name: "quantity" }) || "";
  const rateStr = useWatch({ control: form.control, name: "rate" }) || "";
  const paidAmountStr = useWatch({ control: form.control, name: "paidAmount" }) || "";
  const enteringPaddyId = useWatch({ control: form.control, name: "enteringPaddyId" }) || "";
  const selectedEnteringPaddy =
    (enteringPaddies?.items ?? []).find((item) => item.id === enteringPaddyId) ||
    null;
  const isLinkedToEntering = Boolean(selectedEnteringPaddy || defaultValues?.enteringPaddyId);
  const forceSourceDriven = !defaultValues || isLinkedToEntering;
  const requiresSourceSelection = !defaultValues && !selectedEnteringPaddy;

  const { totalAmount, paidAmountPreview, remainingAmount } = useMemo(() => {
    const quantity = Number(quantityStr);
    const rate = Number(rateStr);
    const total =
      Number.isFinite(quantity) && Number.isFinite(rate) && quantity >= 0 && rate >= 0
        ? quantity * rate
        : 0;

    let paid = 0;
    if (paymentType === "paid") {
      paid = total;
    } else if (paymentType === "partial_paid") {
      const entered = Number(paidAmountStr);
      paid = Number.isFinite(entered) && entered > 0 ? entered : 0;
    }

    return {
      totalAmount: total,
      paidAmountPreview: paid,
      remainingAmount: Math.max(total - paid, 0),
    };
  }, [quantityStr, rateStr, paidAmountStr, paymentType]);

  useEffect(() => {
    if (paymentType === "remaining") {
      form.setValue("paymentChannel", "cash");
      form.setValue("sarafId", "");
      form.setValue("paidAmount", "0");
      return;
    }

    if (paymentType === "paid") {
      form.setValue("paidAmount", totalAmount > 0 ? totalAmount.toFixed(2) : "0");
      return;
    }

    if (paymentType === "partial_paid") {
      const current = Number(form.getValues("paidAmount") || 0);
      if (!Number.isFinite(current) || current <= 0 || current >= totalAmount) {
        form.setValue("paidAmount", "");
      }
    }
  }, [paymentType, totalAmount, form]);

  useEffect(() => {
    if (paymentChannel === "cash") {
      form.setValue("sarafId", "");
    }
  }, [paymentChannel, form]);

  useEffect(() => {
    const items = currenciesData?.items ?? [];
    if (!items.length || form.getValues("sarafLedgerCurrencyId")) {
      return;
    }
    const preferred = items.find((c) => c.code === "USD") ?? items[0];
    form.setValue("sarafLedgerCurrencyId", preferred.id);
  }, [currenciesData?.items, form]);

  useEffect(() => {
    if (!selectedEnteringPaddy) {
      return;
    }

    form.setValue("variety", selectedEnteringPaddy.variety, { shouldValidate: true });
    form.setValue("enteringBillNo", selectedEnteringPaddy.billNo, { shouldValidate: true });
    form.setValue("quantity", selectedEnteringPaddy.weight, { shouldValidate: true });
    form.setValue("unit", "seven_kg", { shouldValidate: true });
    form.setValue("ownerName", selectedEnteringPaddy.paddyOwner, { shouldValidate: true });
    form.setValue("receivedDate", selectedEnteringPaddy.date.slice(0, 10), { shouldValidate: true });
  }, [form, selectedEnteringPaddy]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex min-h-0 max-h-[calc(85vh-7.5rem)] flex-1 flex-col"
      >
        <input type="hidden" {...form.register("unit")} />

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pe-1">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DynamicLocalSelect
            name="enteringPaddyId"
            label={t("common:entering_paddy_source")}
            control={form.control}
            options={enteringOptions}
            placeholder={t("common:select", { name: t("common:entering_paddy_source") })}
            disabled={Boolean(defaultValues?.enteringPaddyId)}
          />

          <DynamicLocalSelect
            name="variety"
            label={t("common:variety")}
            control={form.control}
            required
            options={varietyOptions}
            placeholder={t("common:select", { name: t("common:variety") })}
            disabled={
              forceSourceDriven || (!forceSourceDriven && (varietiesLoading || noPaddyVarieties))
            }
          />
          {!forceSourceDriven && noPaddyVarieties && !varietiesLoading ? (
            <p className="text-sm text-muted-foreground md:col-span-2">
              {t("common:verieties_catalog_empty_hint")}
            </p>
          ) : null}

          <InputField
            name="billNo"
            label={t("common:warehouse_bill_no")}
            control={form.control}
            disabled
            placeholder={generatedBillPreview}
          />

          <InputField
            name="enteringBillNo"
            label={t("common:entering_bill_no")}
            control={form.control}
            disabled
            placeholder={t("common:auto_filled_from_entering")}
          />

          <DatePickerField
            name="receivedDate"
            label={t("common:received_date")}
            control={form.control}
            required
            disabled={forceSourceDriven}
          />

          <InputField
            name="ownerName"
            label={t("common:owner_name")}
            placeholder={t("common:enter", { name: t("common:owner_name") })}
            control={form.control}
            required
            characterRestriction="none"
            disabled={forceSourceDriven}
          />

          <InputField
            name="quantity"
            label={t("common:quantity_seer")}
            placeholder={t("common:enter", { name: t("common:quantity") })}
            control={form.control}
            required
            type="number"
            characterRestriction="none"
            disabled={forceSourceDriven}
          />

          <InputField
            name="rate"
            label={t("common:rate")}
            placeholder={t("common:enter", { name: t("common:rate") })}
            control={form.control}
            required
            type="number"
            characterRestriction="none"
          />

          <div className="md:col-span-2 space-y-2 rounded-lg border bg-muted/20 p-4">
            <DynamicLocalSelect
              name="paymentChannel"
              label={t("common:jwali_payment_mode")}
              control={form.control}
              required
              options={paymentRouteOptions}
              placeholder={t("common:select", { name: t("common:jwali_payment_mode") })}
              disabled={paymentType === "remaining"}
            />
            <p className="text-xs text-muted-foreground">
              {paymentType === "remaining"
                ? t("common:paddy_seller_route_remaining_hint")
                : paymentChannel === "saraf"
                  ? t("common:paddy_seller_route_saraf_hint")
                  : t("common:paddy_seller_route_cash_hint")}
            </p>
          </div>

          <DynamicLocalSelect
            name="paymentType"
            label={t("common:payment_type")}
            control={form.control}
            required
            options={paymentTypeOptions}
            placeholder={t("common:select", { name: t("common:payment_type") })}
          />

          <InputField
            name="paidAmount"
            label={t("common:paid_amount")}
            placeholder={t("common:enter", { name: t("common:paid_amount") })}
            control={form.control}
            type="number"
            disabled={paymentType !== "partial_paid"}
            characterRestriction="none"
          />

          {paymentChannel === "cash" ? (
            <DynamicLocalSelect
              name="sarafLedgerCurrencyId"
              label={t("common:currency")}
              control={form.control}
              required
              options={currencyOptions}
              disabled={currenciesLoading || currencyOptions.length === 0}
              placeholder={t("common:select", { name: t("common:currency") })}
            />
          ) : null}

          {paymentChannel === "saraf" && paymentType !== "remaining" ? (
            <>
              <DynamicLocalSelect
                name="sarafId"
                label={t("common:rice_sale_saraf_for_ledger")}
                control={form.control}
                required
                options={sarafOptions}
                disabled={!seasonId || sarafOptions.length === 0}
                placeholder={t("common:select", { name: t("common:rice_sale_saraf_for_ledger") })}
              />
              <DynamicLocalSelect
                name="sarafLedgerCurrencyId"
                label={t("common:rice_sale_saraf_currency")}
                control={form.control}
                required
                options={currencyOptions}
                disabled={currenciesLoading || currencyOptions.length === 0}
                placeholder={t("common:select", { name: t("common:rice_sale_saraf_currency") })}
              />
            </>
          ) : null}

          <InputField
            name="notes"
            label={t("common:notes")}
            placeholder={t("common:enter", { name: t("common:notes") })}
            control={form.control}
            characterRestriction="none"
            className="md:col-span-2"
          />
        </div>

        {enteringOptions.length === 0 ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {t("common:no_company_entering_paddy_source_hint")}
          </div>
        ) : requiresSourceSelection ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {t("common:select_entering_paddy_required_hint")}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("common:total_amount")}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatDisplayAmount(totalAmount, locale)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("common:quantity")} × {t("common:rate")}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("common:paid_amount")}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatDisplayAmount(paidAmountPreview, locale)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(`common:${paymentType || "paid"}`)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("common:remaining_amount")}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatDisplayAmount(remainingAmount, locale)}
            </p>
          </div>
        </div>
        </div>

        <div className="mt-4 flex shrink-0 gap-3 border-t pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || (!activeSeason && !defaultValues) || requiresSourceSelection}
          >
            {isSubmitting
              ? t("common:saving", { name: t("admin:paddy_warehouse") })
              : t("common:save", { name: t("admin:paddy_warehouse") })}
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
