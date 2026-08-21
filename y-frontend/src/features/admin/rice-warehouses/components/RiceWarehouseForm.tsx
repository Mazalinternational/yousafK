import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { quantityInputFromRecord } from "@/utils/weightUnit";
import { useCurrencies } from "../../currencies/hooks/useCurrencies";
import { useCustomers } from "../../customer/hooks/useCustomers";
import { useSarafs } from "../../sarafi/hooks/useSarafs";
import type { Season } from "../../seasons/schemas/season";
import { useVarietySelectOptions } from "../../verieties/hooks";
import {
  RICE_PAYMENT_TYPE_OPTIONS,
  RICE_WAREHOUSE_SELLER_PAYMENT_ROUTE,
  createRiceWarehouseFormSchema,
  type RiceWarehouse,
  type RiceWarehouseFormValues,
} from "../schemas/rice-warehouse";

interface RiceWarehouseFormProps {
  activeSeason: Season | null;
  defaultValues: RiceWarehouse | null;
  initialValues?: Partial<RiceWarehouseFormValues>;
  onSubmit: (values: RiceWarehouseFormValues) => void;
  isSubmitting?: boolean;
}

export function RiceWarehouseForm({
  activeSeason,
  defaultValues,
  initialValues,
  onSubmit,
  isSubmitting,
}: RiceWarehouseFormProps) {
  const { t } = useTranslation();
  const seasonId = activeSeason?.id || defaultValues?.seasonId;
  const {
    options: varietyOptions,
    isLoading: varietiesLoading,
    isEmpty: noRiceVarieties,
  } = useVarietySelectOptions("RICE");
  const paymentTypeOptions = RICE_PAYMENT_TYPE_OPTIONS.map((paymentType) => ({
    value: paymentType,
    label: t(`common:${paymentType}`),
  }));
  const paymentRouteOptions = RICE_WAREHOUSE_SELLER_PAYMENT_ROUTE.map((route) => ({
    value: route,
    label:
      route === "cash" ? t("common:jwali_paid_by_cash") : t("common:jwali_paid_by_saraf"),
  }));
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
  const { data: customersData } = useCustomers({
    pageNumber: 1,
    pageSize: 1000,
    seasonId,
    type: "rice_seller",
    sortBy: "name",
    sortDirection: "asc",
  });
  const customerOptions = (customersData?.items ?? []).map((customer) => ({
    value: customer.id,
    label: `${customer.name} - ${customer.phoneNo}`,
  }));

  const formSchema = useMemo(() => createRiceWarehouseFormSchema(t), [t]);

  const form = useForm<RiceWarehouseFormValues>({
    resolver: zodResolver(formSchema) as Resolver<RiceWarehouseFormValues>,
    defaultValues: {
      customerId: initialValues?.customerId ?? defaultValues?.customerId ?? "",
      variety: initialValues?.variety ?? defaultValues?.variety ?? "",
      quantity:
        initialValues?.quantity != null && initialValues.quantity !== ""
          ? quantityInputFromRecord(initialValues.quantity, initialValues.unit)
          : defaultValues?.quantity != null && defaultValues.quantity !== ""
            ? quantityInputFromRecord(defaultValues.quantity, defaultValues.unit)
            : "",
      unit: "seven_kg",
      ownerName: initialValues?.ownerName ?? defaultValues?.ownerName ?? "",
      rate: initialValues?.rate ?? defaultValues?.rate ?? "",
      paymentType: initialValues?.paymentType ?? defaultValues?.paymentType ?? "paid",
      paidAmount: initialValues?.paidAmount ?? defaultValues?.paidAmount ?? "0",
      paymentChannel:
        initialValues?.paymentChannel ?? defaultValues?.paymentChannel ?? "cash",
      sarafId: initialValues?.sarafId ?? defaultValues?.sarafId ?? "",
      sarafLedgerCurrencyId:
        initialValues?.sarafLedgerCurrencyId ??
        defaultValues?.sarafLedgerCurrencyId ??
        "",
      receivedDate:
        initialValues?.receivedDate ?? defaultValues?.receivedDate?.slice(0, 10) ?? "",
      notes: initialValues?.notes ?? defaultValues?.notes ?? "",
    },
  });

  const paymentType = useWatch({ control: form.control, name: "paymentType" }) || "";
  const paymentChannel = useWatch({ control: form.control, name: "paymentChannel" }) || "cash";
  const customerId = useWatch({ control: form.control, name: "customerId" }) || "";
  const selectedCustomer =
    (customersData?.items ?? []).find((customer) => customer.id === customerId) || null;

  useEffect(() => {
    if (paymentType === "remaining") {
      form.setValue("paymentChannel", "cash");
      form.setValue("sarafId", "");
    }
  }, [paymentType, form]);

  useEffect(() => {
    if (paymentChannel === "cash") {
      form.setValue("sarafId", "");
    }
  }, [paymentChannel, form]);

  useEffect(() => {
    if (!selectedCustomer) {
      return;
    }

    form.setValue("ownerName", selectedCustomer.name, { shouldValidate: true });
  }, [form, selectedCustomer]);

  useEffect(() => {
    if (varietiesLoading || varietyOptions.length === 0) {
      return;
    }
    const current = form.getValues("variety");
    if (!current || !varietyOptions.some((o) => o.value === current)) {
      form.setValue("variety", varietyOptions[0].value, { shouldValidate: true });
    }
  }, [varietiesLoading, varietyOptions, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...form.register("unit")} />
        {/* <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">{t("common:stock_type")}</p>
            <p className="mt-1 text-base font-semibold">{t("common:company_owned")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{RICE_STOCK_TYPE}</p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">{t("common:season")}</p>
            <p className="mt-1 text-base font-semibold">
              {activeSeason?.name || defaultValues?.seasonName || t("common:no_active_season")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("common:rice_warehouse_season_hint")}
            </p>
          </div>
        </div> */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DynamicLocalSelect
            name="variety"
            label={t("common:variety")}
            control={form.control}
            required
            options={varietyOptions}
            placeholder={t("common:select", { name: t("common:variety") })}
            disabled={varietiesLoading || noRiceVarieties}
          />
          {noRiceVarieties && !varietiesLoading ? (
            <p className="text-sm text-muted-foreground md:col-span-2">
              {t("common:verieties_catalog_empty_hint")}
            </p>
          ) : null}

          <DatePickerField
            name="receivedDate"
            label={t("common:received_date")}
            control={form.control}
            required
          />

          <DynamicLocalSelect
            name="customerId"
            label={t("common:owner_name")}
            control={form.control}
            required
            options={customerOptions}
            placeholder={t("common:select", { name: t("common:owner_name") })}
          />

          <InputField
            name="ownerName"
            label={t("common:owner_name")}
            placeholder={t("common:enter", { name: t("common:owner_name") })}
            control={form.control}
            required
            characterRestriction="none"
            disabled
          />

          <InputField
            name="quantity"
            label={t("common:quantity_seer")}
            placeholder={t("common:enter", { name: t("common:quantity") })}
            control={form.control}
            required
            type="number"
            characterRestriction="none"
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

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              (!activeSeason && !defaultValues) ||
              varietiesLoading ||
              noRiceVarieties
            }
          >
            {isSubmitting
              ? t("common:saving", { name: t("admin:rice_warehouse") })
              : t("common:save", { name: t("admin:rice_warehouse") })}
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
