import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useEffect, useMemo, type ReactNode } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formatWeightFromKg } from "@/utils/weightUnit";
import { formatDisplayAmount } from "@/utils/displayLocale";
import { getDisplayLocale } from "@/utils/displayLocale";
import { useCurrencies } from "../../currencies/hooks/useCurrencies";
import { useCustomers } from "../../customer/hooks/useCustomers";
import { RICE_PAYMENT_TYPE_OPTIONS } from "../../rice-warehouses/schemas/rice-warehouse";
import { useSarafs } from "../../sarafi/hooks/useSarafs";
import type { Season } from "../../seasons/schemas/season";
import { RICE_SALE_PAYMENT_ROUTE } from "../../rice-sales/schemas/rice-sale";
import {
  getStoreVarietySaleInvoiceTotal,
  getStoreVarietySaleRemainingBalance,
  StoreVarietySaleFormSchema,
  storeVarietySaleToFormValues,
  type StoreVarietySale,
  type StoreVarietySaleFormValues,
} from "../schemas/store-variety-sale";
import type { StoreType } from "../schemas/store";

const today = new Date().toISOString().slice(0, 10);

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

export function StoreVarietySaleForm({
  activeSeason,
  storeType,
  variety,
  availableWeightKg,
  pooled = false,
  initialSale,
  onSubmit,
  isSubmitting,
}: {
  activeSeason: Season | null;
  storeType: StoreType;
  variety: string;
  availableWeightKg: string;
  pooled?: boolean;
  initialSale?: StoreVarietySale | null;
  onSubmit: (values: StoreVarietySaleFormValues) => void;
  isSubmitting?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const seasonId = activeSeason?.id;

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

  const form = useForm<StoreVarietySaleFormValues>({
    resolver: zodResolver(StoreVarietySaleFormSchema) as Resolver<StoreVarietySaleFormValues>,
    defaultValues: {
      storeType,
      variety,
      buyerCustomerId: "",
      soldWeight: "",
      unit: "seven_kg",
      saleDate: today,
      ratePerSeer: "",
      totalAmount: "",
      loadingAmount: "0",
      riceBagsAmount: "0",
      paymentType: "paid",
      paidAmount: "0",
      paymentChannel: "cash",
      sarafId: "",
      sarafLedgerCurrencyId: "",
      notes: "",
    },
  });

  const paymentType = useWatch({ control: form.control, name: "paymentType" }) || "";
  const paymentChannel = useWatch({ control: form.control, name: "paymentChannel" }) || "cash";
  const soldWeightStr = useWatch({ control: form.control, name: "soldWeight" });
  const ratePerSeerStr = useWatch({ control: form.control, name: "ratePerSeer" });
  const totalAmountStr = useWatch({ control: form.control, name: "totalAmount" });
  const loadingAmountStr = useWatch({ control: form.control, name: "loadingAmount" });
  const riceBagsAmountStr = useWatch({ control: form.control, name: "riceBagsAmount" });
  const paidAmountStr = useWatch({ control: form.control, name: "paidAmount" });

  const invoiceTotal = useMemo(
    () =>
      getStoreVarietySaleInvoiceTotal({
        storeType,
        soldWeight: soldWeightStr || "0",
        ratePerSeer: ratePerSeerStr,
        totalAmount: totalAmountStr,
        loadingAmount: pooled ? loadingAmountStr : "0",
        riceBagsAmount: pooled ? riceBagsAmountStr : "0",
      }),
    [
      storeType,
      soldWeightStr,
      ratePerSeerStr,
      totalAmountStr,
      loadingAmountStr,
      riceBagsAmountStr,
      pooled,
    ],
  );

  const remainingBalance = useMemo(
    () =>
      getStoreVarietySaleRemainingBalance({
        storeType,
        soldWeight: soldWeightStr || "0",
        ratePerSeer: ratePerSeerStr,
        totalAmount: totalAmountStr,
        loadingAmount: pooled ? loadingAmountStr : "0",
        riceBagsAmount: pooled ? riceBagsAmountStr : "0",
        paymentType,
        paidAmount: paidAmountStr,
      }),
    [
      storeType,
      soldWeightStr,
      ratePerSeerStr,
      totalAmountStr,
      loadingAmountStr,
      riceBagsAmountStr,
      pooled,
      paymentType,
      paidAmountStr,
    ],
  );

  useEffect(() => {
    if (initialSale) {
      form.reset(storeVarietySaleToFormValues(initialSale));
      return;
    }

    form.reset({
      storeType,
      variety,
      buyerCustomerId: "",
      soldWeight: "",
      unit: "seven_kg",
      saleDate: today,
      ratePerSeer: "",
      totalAmount: "",
      loadingAmount: "0",
      riceBagsAmount: "0",
      paymentType: "paid",
      paidAmount: "0",
      paymentChannel: "cash",
      sarafId: "",
      sarafLedgerCurrencyId: "",
      notes: "",
    });
  }, [initialSale, storeType, variety, form]);

  useEffect(() => {
    if (initialSale) {
      return;
    }

    form.setValue("storeType", storeType);
    form.setValue("variety", variety);
  }, [storeType, variety, form, initialSale]);

  useEffect(() => {
    if (!pooled) {
      return;
    }

    const soldWeight = Number(soldWeightStr);
    const ratePerSeer = Number(ratePerSeerStr);

    if (
      soldWeightStr?.trim() &&
      ratePerSeerStr?.trim() &&
      !Number.isNaN(soldWeight) &&
      !Number.isNaN(ratePerSeer) &&
      soldWeight > 0 &&
      ratePerSeer > 0
    ) {
      form.setValue("totalAmount", (soldWeight * ratePerSeer).toFixed(2), {
        shouldValidate: true,
        shouldDirty: true,
      });
      return;
    }

    form.setValue("totalAmount", "", { shouldValidate: false });
  }, [pooled, soldWeightStr, ratePerSeerStr, form]);

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
    if (
      (paymentChannel === "cash" || paymentChannel === "saraf") &&
      !form.getValues("sarafLedgerCurrencyId") &&
      defaultCurrencyId
    ) {
      form.setValue("sarafLedgerCurrencyId", defaultCurrencyId);
    }
  }, [paymentChannel, paymentType, defaultCurrencyId, form]);

  const showPaymentSaraf = paymentChannel === "saraf" && paymentType !== "remaining";
  const showPaymentCashCurrency = paymentChannel === "cash";

  const paymentFields = (
    <>
      <div
        className={
          showPaymentSaraf
            ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            : showPaymentCashCurrency
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

        {showPaymentSaraf ? (
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

        {showPaymentSaraf || showPaymentCashCurrency ? (
          <DynamicLocalSelect
            name="sarafLedgerCurrencyId"
            label={
              showPaymentSaraf
                ? t("common:rice_sale_saraf_currency")
                : t("common:rice_sale_cash_currency")
            }
            control={form.control}
            required
            options={currencyOptions}
            disabled={currenciesLoading || currencyOptions.length === 0}
            placeholder={t("common:select", {
              name: showPaymentSaraf
                ? t("common:rice_sale_saraf_currency")
                : t("common:rice_sale_cash_currency"),
            })}
          />
        ) : null}
      </div>
    </>
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={pooled ? "space-y-8" : "space-y-6"}
      >
        <input type="hidden" {...form.register("unit")} />

        {pooled ? (
          <>
            <motion.div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t("common:season")}</p>
                  <p className="text-base font-semibold">
                    {activeSeason?.name || t("common:no_active_season")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("common:store_pooled_sale_hint")}
                  </p>
                </div>
                <div className="space-y-1 text-end text-xs text-muted-foreground">
                  <p>
                    {t("common:store_variety_sale_available", {
                      weight: formatWeightFromKg(availableWeightKg, t),
                    })}
                  </p>
                  <p>{t("common:store_variety_sale_bill_hint")}</p>
                  {initialSale ? (
                    <p className="font-medium text-foreground">{initialSale.billNo}</p>
                  ) : null}
                </div>
              </div>
            </motion.div>

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
              </div>
              {buyerOptions.length === 0 ? (
                <p className="text-xs text-amber-700">
                  {t("common:store_variety_sale_no_buyers_hint")}
                </p>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <InputField
                  name="soldWeight"
                  label={t("common:quantity_seer")}
                  placeholder={t("common:enter", { name: t("common:quantity_seer") })}
                  control={form.control}
                  required
                  type="number"
                  characterRestriction="none"
                />
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
                  label={t("common:sale_amount")}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("common:rice_sale_invoice_total")}
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {formatDisplayAmount(invoiceTotal, locale)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("common:remaining_amount")}
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {formatDisplayAmount(remainingBalance, locale)}
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
              </div>

              <div className="rounded-lg border bg-muted/15 p-4">
                <p className="mb-1 text-sm font-semibold">
                  {t("common:rice_sale_rice_payment_section")}
                </p>
                <p className="mb-4 text-xs text-muted-foreground">
                  {t("common:rice_sale_payment_applies_to_all_hint")}
                </p>
                {paymentFields}
              </div>

              <InputField
                name="notes"
                label={t("common:notes")}
                placeholder={t("common:enter", { name: t("common:notes") })}
                control={form.control}
                characterRestriction="none"
              />
            </FormSection>
          </>
        ) : (
          <>
            <motion.div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-medium">{t("common:season")}</p>
              <p className="text-base font-semibold">
                {activeSeason?.name || t("common:no_active_season")}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">{t("common:variety")}: </span>
                <span className="font-semibold">{variety}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {t("common:store_variety_sale_available", {
                  weight: formatWeightFromKg(availableWeightKg, t),
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("common:store_variety_sale_bill_hint")}
              </p>
            </motion.div>

            <motion.div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DynamicLocalSelect
                name="buyerCustomerId"
                label={t("common:buyer")}
                control={form.control}
                required
                options={buyerOptions}
                placeholder={t("common:select", { name: t("common:buyer") })}
              />
              {buyerOptions.length === 0 ? (
                <p className="text-xs text-amber-700 md:col-span-2">
                  {t("common:store_variety_sale_no_buyers_hint")}
                </p>
              ) : null}

              <InputField
                name="soldWeight"
                label={t("common:quantity_seer")}
                placeholder={t("common:enter", { name: t("common:quantity_seer") })}
                control={form.control}
                required
                characterRestriction="none"
              />

              <InputField
                name="totalAmount"
                label={t("common:sale_amount")}
                placeholder={t("common:enter", { name: t("common:sale_amount") })}
                control={form.control}
                required
                type="number"
                characterRestriction="none"
              />

              <DatePickerField
                name="saleDate"
                label={t("common:date")}
                control={form.control}
                required
              />

              <DynamicLocalSelect
                name="paymentType"
                label={t("common:payment_type")}
                control={form.control}
                required
                options={paymentTypeOptions}
              />

              <InputField
                name="paidAmount"
                label={t("common:paid_amount")}
                control={form.control}
                type="number"
                disabled={paymentType !== "partial_paid"}
                characterRestriction="none"
              />

              <motion.div className="md:col-span-2 space-y-2 rounded-lg border bg-muted/20 p-4">
                <DynamicLocalSelect
                  name="paymentChannel"
                  label={t("common:rice_sale_where_money_goes")}
                  control={form.control}
                  required
                  options={paymentRouteOptions}
                  disabled={paymentType === "remaining"}
                />
              </motion.div>

              {showPaymentSaraf ? (
                <>
                  <DynamicLocalSelect
                    name="sarafId"
                    label={t("common:rice_sale_saraf_for_ledger")}
                    control={form.control}
                    required
                    options={sarafOptions}
                    disabled={!seasonId}
                  />
                  <DynamicLocalSelect
                    name="sarafLedgerCurrencyId"
                    label={t("common:rice_sale_saraf_currency")}
                    control={form.control}
                    required
                    options={currencyOptions}
                    disabled={currenciesLoading}
                  />
                </>
              ) : null}

              {showPaymentCashCurrency ? (
                <DynamicLocalSelect
                  name="sarafLedgerCurrencyId"
                  label={t("common:rice_sale_cash_currency")}
                  control={form.control}
                  required
                  options={currencyOptions}
                  disabled={currenciesLoading || currencyOptions.length === 0}
                />
              ) : null}

              <InputField
                name="notes"
                label={t("common:notes")}
                control={form.control}
                className="md:col-span-2"
                characterRestriction="none"
              />
            </motion.div>
          </>
        )}

        <Button type="submit" disabled={isSubmitting} className="hover:cursor-pointer">
          {isSubmitting
            ? t("common:saving", { name: t("common:ledger_entry_store_variety_sale") })
            : initialSale
              ? t("common:update_success", { name: t("common:ledger_entry_store_variety_sale") })
              : t("common:save", { name: t("common:ledger_entry_store_variety_sale") })}
        </Button>
      </form>
    </Form>
  );
}
