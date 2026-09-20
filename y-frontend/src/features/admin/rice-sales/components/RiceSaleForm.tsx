import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useEffect, useMemo, type ReactNode } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  formatAvailableStockFromKg,
  formatWeightFromKg,
  kgToSeer,
  SEER_KG,
  stockValueClassName,
} from "@/utils/weightUnit";
import { useCurrencies } from "../../currencies/hooks/useCurrencies";
import { useCustomers } from "../../customer/hooks/useCustomers";
import { useRiceWarehouseDashboard } from "../../rice-warehouses/hooks/useRiceWarehouseDashboard";
import { RICE_PAYMENT_TYPE_OPTIONS } from "../../rice-warehouses/schemas/rice-warehouse";
import { useSarafs } from "../../sarafi/hooks/useSarafs";
import type { Season } from "../../seasons/schemas/season";
import {
  getRiceSaleInvoiceTotal,
  RICE_SALE_PAYMENT_ROUTE,
  RiceSaleFormSchema,
  type RiceSale,
  type RiceSaleFormValues,
} from "../schemas/rice-sale";

interface RiceSaleFormProps {
  activeSeason: Season | null;
  initialSale?: RiceSale | null;
  onSubmit: (values: RiceSaleFormValues) => void;
  isSubmitting?: boolean;
}

function saleToFormValues(sale: RiceSale): RiceSaleFormValues {
  const quantity = Number(sale.quantity);
  const totalAmount = Number(sale.totalAmount);
  const ratePerSeer =
    quantity > 0 && totalAmount > 0 ? (totalAmount / quantity).toFixed(2) : "";

  return {
    buyerCustomerId: sale.buyerCustomerId,
    riceVariety: sale.riceVariety,
    quantity: sale.quantity,
    unit: sale.unit as "seven_kg",
    saleDate: sale.saleDate.slice(0, 10),
    ratePerSeer,
    totalAmount: sale.totalAmount,
    loadingAmount: sale.loadingAmount ?? "0",
    riceBagsAmount: sale.riceBagsAmount ?? "0",
    paymentType: sale.paymentType,
    paidAmount: sale.paidAmount,
    paymentChannel: sale.paymentChannel,
    sarafId: sale.sarafId ?? "",
    sarafLedgerCurrencyId: sale.sarafLedgerCurrencyId ?? "",
    notes: sale.notes ?? "",
  };
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

const today = new Date().toISOString().slice(0, 10);

export function RiceSaleForm({
  activeSeason,
  initialSale,
  onSubmit,
  isSubmitting,
}: RiceSaleFormProps) {
  const { t } = useTranslation();
  const seasonId = activeSeason?.id;
  const { data: dashboard } = useRiceWarehouseDashboard();

  const { data: buyersData } = useCustomers({
    pageNumber: 1,
    pageSize: 1000,
    seasonId,
    type: "buyer",
    sortBy: "name",
    sortDirection: "asc",
  });

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

  const buyerOptions = (buyersData?.items ?? []).map((c) => ({
    value: c.id,
    label: `${c.name} — ${c.phoneNo}`,
  }));

  const varietyOptions = useMemo(() => {
    const rows = [...(dashboard?.varietyBreakdown ?? [])];
    if (
      initialSale?.riceVariety &&
      !rows.some(
        (row) =>
          row.variety.trim().toLowerCase() ===
          initialSale.riceVariety.trim().toLowerCase(),
      )
    ) {
      rows.push({
        variety: initialSale.riceVariety,
        currentStockKg: "0",
        sellableStockKg: "0",
      } as (typeof rows)[number]);
    }

    return rows.map((v) => ({
      value: v.variety,
      // Match rice warehouse dashboard: book balance (can be negative).
      label: `${v.variety} (${formatAvailableStockFromKg(v.currentStockKg, t)})`,
    }));
  }, [dashboard?.varietyBreakdown, initialSale?.riceVariety, t]);

  const paymentTypeOptions = RICE_PAYMENT_TYPE_OPTIONS.map((paymentType) => ({
    value: paymentType,
    label: t(`common:${paymentType}`),
  }));

  const paymentRouteOptions = RICE_SALE_PAYMENT_ROUTE.map((route) => ({
    value: route,
    label:
      route === "cash" ? t("common:rice_sale_route_cash") : t("common:rice_sale_route_saraf"),
  }));

  const sarafOptions = (sarafsData?.items ?? []).map((s) => ({
    value: s.id,
    label: `${s.name} — ${s.phoneNo}`,
  }));

  const currencyOptions = (currenciesData?.items ?? []).map((c) => ({
    value: c.id,
    label: `${c.code} — ${c.name}`,
  }));

  const defaultCurrencyId = useMemo(() => {
    const items = currenciesData?.items ?? [];
    if (!items.length) {
      return "";
    }
    return (items.find((c) => c.code === "USD") ?? items[0]).id;
  }, [currenciesData?.items]);

  const form = useForm<RiceSaleFormValues>({
    resolver: zodResolver(RiceSaleFormSchema) as Resolver<RiceSaleFormValues>,
    defaultValues: {
      buyerCustomerId: "",
      riceVariety: "",
      quantity: "",
      unit: "seven_kg",
      saleDate: today,
      ratePerSeer: "",
      totalAmount: "",
      loadingAmount: "0",
      riceBagsAmount: "0",
      paymentType: "",
      paidAmount: "0",
      paymentChannel: "cash",
      sarafId: "",
      sarafLedgerCurrencyId: "",
      notes: "",
    },
  });

  const paymentType = useWatch({ control: form.control, name: "paymentType" }) || "";
  const paymentChannel = useWatch({ control: form.control, name: "paymentChannel" }) || "cash";
  const quantityStr = useWatch({ control: form.control, name: "quantity" });
  const riceVariety = useWatch({ control: form.control, name: "riceVariety" });
  const ratePerSeerStr = useWatch({ control: form.control, name: "ratePerSeer" });
  const totalAmountStr = useWatch({ control: form.control, name: "totalAmount" });
  const loadingAmountStr = useWatch({ control: form.control, name: "loadingAmount" });
  const riceBagsAmountStr = useWatch({ control: form.control, name: "riceBagsAmount" });

  const selectedBookStockKg = useMemo(() => {
    const selected = String(riceVariety ?? "").trim().toLowerCase();
    const row = dashboard?.varietyBreakdown?.find(
      (item) => item.variety.trim().toLowerCase() === selected,
    );
    const bookKg = Number(row?.currentStockKg ?? 0);
    return Number.isFinite(bookKg) ? bookKg : 0;
  }, [dashboard?.varietyBreakdown, riceVariety]);

  /** Physical qty still available to take from stock (never negative). */
  const selectedAvailableKg = useMemo(() => {
    let availableKg = Math.max(selectedBookStockKg, 0);

    if (
      initialSale &&
      initialSale.riceVariety.trim().toLowerCase() ===
        String(riceVariety ?? "").trim().toLowerCase() &&
      Number.isFinite(Number(initialSale.fromStockWeightKg))
    ) {
      availableKg += Number(initialSale.fromStockWeightKg);
    }

    return Number.isFinite(availableKg) ? Math.max(availableKg, 0) : 0;
  }, [initialSale, riceVariety, selectedBookStockKg]);

  const oversoldSeer = useMemo(() => {
    const requested = Number(quantityStr);
    if (!Number.isFinite(requested) || requested <= 0) {
      return 0;
    }

    return Math.max(0, requested - kgToSeer(selectedAvailableKg));
  }, [quantityStr, selectedAvailableKg]);

  const invoiceTotal = useMemo(
    () =>
      getRiceSaleInvoiceTotal({
        totalAmount: totalAmountStr || "0",
        loadingAmount: loadingAmountStr,
        riceBagsAmount: riceBagsAmountStr,
      }),
    [totalAmountStr, loadingAmountStr, riceBagsAmountStr],
  );

  useEffect(() => {
    if (initialSale) {
      form.reset(saleToFormValues(initialSale));
    }
  }, [initialSale, form]);

  useEffect(() => {
    const quantity = Number(quantityStr);
    const ratePerSeer = Number(ratePerSeerStr);

    if (
      quantityStr?.trim() &&
      ratePerSeerStr?.trim() &&
      !Number.isNaN(quantity) &&
      !Number.isNaN(ratePerSeer) &&
      quantity > 0 &&
      ratePerSeer > 0
    ) {
      form.setValue("totalAmount", (quantity * ratePerSeer).toFixed(2), {
        shouldValidate: true,
        shouldDirty: true,
      });
      return;
    }

    form.setValue("totalAmount", "", { shouldValidate: false });
  }, [quantityStr, ratePerSeerStr, form]);

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
    if (!defaultCurrencyId) {
      return;
    }

    if (
      (paymentChannel === "cash" || paymentChannel === "saraf") &&
      !form.getValues("sarafLedgerCurrencyId")
    ) {
      form.setValue("sarafLedgerCurrencyId", defaultCurrencyId);
    }
  }, [defaultCurrencyId, form, paymentChannel, paymentType]);

  const showRiceSaraf = paymentChannel === "saraf" && paymentType !== "remaining";
  const showRiceCashCurrency = paymentChannel === "cash";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <input type="hidden" {...form.register("unit")} />

        <FormSection title={t("common:rice_sale_section_details")}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DynamicLocalSelect
              name="buyerCustomerId"
              label={t("common:buyer")}
              control={form.control}
              required
              options={buyerOptions}
              placeholder={t("common:select", { name: t("common:buyer") })}
            />

            <DatePickerField
              name="saleDate"
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

            {riceVariety ? (
              <div className="md:col-span-2 rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  {t("common:current_stock_balance")}
                </p>
                <p
                  className={`mt-1 text-lg font-semibold tabular-nums ${
                    stockValueClassName(selectedBookStockKg) ?? ""
                  }`}
                >
                  {formatAvailableStockFromKg(selectedBookStockKg, t)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("common:available_rice_stock_hint")}
                </p>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InputField
              name="quantity"
              label={t("common:quantity_seer")}
              placeholder={t("common:enter", { name: t("common:quantity_seer") })}
              control={form.control}
              required
              type="number"
              characterRestriction="none"
            />
            {oversoldSeer > 0.0001 ? (
              <p className="sm:col-span-3 text-sm text-amber-700">
                {t("common:sale_oversell_warning", {
                  extra: formatWeightFromKg(oversoldSeer * SEER_KG, t),
                  available: formatAvailableStockFromKg(selectedAvailableKg, t),
                })}
              </p>
            ) : null}

            <InputField
              name="ratePerSeer"
              label={t("common:rate_per_seer")}
              placeholder={t("common:enter", { name: t("common:rate_per_seer") })}
              control={form.control}
              required
              type="number"
              characterRestriction="none"
            />

            <InputField
              name="totalAmount"
              label={t("common:rice_sale_rice_amount")}
              control={form.control}
              type="number"
              characterRestriction="none"
              disabled
            />
          </div>
        </FormSection>

        <FormSection
          title={t("common:rice_sale_section_charges")}
          description={t("common:rice_sale_charges_amount_only_hint")}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              name="loadingAmount"
              label={t("common:rice_sale_loading_amount")}
              placeholder={t("common:enter", { name: t("common:rice_sale_loading_amount") })}
              control={form.control}
              type="number"
              characterRestriction="none"
            />

            <InputField
              name="riceBagsAmount"
              label={t("common:rice_sale_bags_amount")}
              placeholder={t("common:enter", { name: t("common:rice_sale_bags_amount") })}
              control={form.control}
              type="number"
              characterRestriction="none"
            />
          </div>
        </FormSection>

        <FormSection title={t("common:rice_sale_section_payment")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">
                {t("common:rice_sale_invoice_total")}
              </p>
              <p className="mt-1 text-xl font-semibold">{invoiceTotal.toFixed(2)}</p>
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
          </div>

          <div className="rounded-lg border bg-muted/15 p-4">
            <p className="mb-1 text-sm font-semibold">{t("common:rice_sale_rice_payment_section")}</p>
            <p className="mb-4 text-xs text-muted-foreground">
              {t("common:rice_sale_payment_applies_to_all_hint")}
            </p>

            <div
              className={
                showRiceSaraf
                  ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                  : showRiceCashCurrency
                    ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
                    : "max-w-md"
              }
            >
              <DynamicLocalSelect
                name="paymentChannel"
                label={t("common:rice_sale_payment_route")}
                control={form.control}
                required
                options={paymentRouteOptions}
                placeholder={t("common:select", { name: t("common:rice_sale_payment_route") })}
                disabled={paymentType === "remaining"}
              />

              {showRiceSaraf ? (
                <DynamicLocalSelect
                  name="sarafId"
                  label={t("common:rice_sale_saraf_for_ledger")}
                  control={form.control}
                  required
                  options={sarafOptions}
                  disabled={!seasonId || sarafOptions.length === 0}
                  placeholder={t("common:select", { name: t("common:rice_sale_saraf_for_ledger") })}
                />
              ) : null}

              {showRiceSaraf || showRiceCashCurrency ? (
                <DynamicLocalSelect
                  name="sarafLedgerCurrencyId"
                  label={
                    showRiceSaraf
                      ? t("common:rice_sale_saraf_currency")
                      : t("common:rice_sale_cash_currency")
                  }
                  control={form.control}
                  required
                  options={currencyOptions}
                  disabled={currenciesLoading || currencyOptions.length === 0}
                  placeholder={t("common:select", {
                    name: showRiceSaraf
                      ? t("common:rice_sale_saraf_currency")
                      : t("common:rice_sale_cash_currency"),
                  })}
                />
              ) : null}
            </div>
          </div>

          <InputField
            name="notes"
            label={t("common:notes")}
            placeholder={t("common:enter", { name: t("common:notes") })}
            control={form.control}
            characterRestriction="none"
          />
        </FormSection>

        <div className="flex gap-3 border-t pt-4">
          <Button type="submit" disabled={isSubmitting || !activeSeason}>
            {isSubmitting
              ? t("common:saving", { name: t("admin:rice_sale") })
              : t("common:save", { name: t("admin:rice_sale") })}
          </Button>
          {!initialSale ? (
            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isSubmitting}>
              {t("common:reset")}
            </Button>
          ) : null}
        </div>
      </form>
    </Form>
  );
}
