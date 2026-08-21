import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useCustomers } from "../../customer/hooks/useCustomers";
import { useCurrencies } from "../../currencies/hooks/useCurrencies";
import { useExpenseCategories } from "../../expense-categories/hooks/useExpenseCategories";
import { RICE_PAYMENT_TYPE_OPTIONS } from "../../rice-warehouses/schemas/rice-warehouse";
import { useSarafs } from "../../sarafi/hooks/useSarafs";
import type { Season } from "../../seasons/schemas/season";
import {
  createExpenseFormSchema,
  EXPENSE_SETTLEMENT_MODE,
  type Expense,
  type ExpenseFormValues,
} from "../schemas/expense";

interface ExpenseFormProps {
  activeSeason: Season | null;
  defaultValues?: Expense | null;
  onSubmit: (values: ExpenseFormValues) => void;
  isSubmitting?: boolean;
}

export function ExpenseForm({
  activeSeason,
  defaultValues,
  onSubmit,
  isSubmitting,
}: ExpenseFormProps) {
  const { t } = useTranslation();
  const expenseFormSchema = useMemo(() => createExpenseFormSchema(t), [t]);
  const generatedBillPreview = `${activeSeason?.code?.trim().toUpperCase() || t("common:expense_bill_season_fallback")}-EX-*`;
  const seasonId = activeSeason?.id || defaultValues?.seasonId;

  const settlementModeOptions = EXPENSE_SETTLEMENT_MODE.map((mode) => ({
    value: mode,
    label:
      mode === "direct"
        ? t("common:expense_settlement_direct")
        : t("common:expense_settlement_vendor"),
  }));

  const paymentTypeOptions = RICE_PAYMENT_TYPE_OPTIONS.map((type) => ({
    value: type,
    label: t(`common:${type}`),
  }));

  const paymentRouteOptions = [
    { value: "cash", label: t("common:jwali_paid_by_cash") },
    { value: "saraf", label: t("common:jwali_paid_by_saraf") },
  ];

  const { data: categoriesPage, isLoading: categoriesLoading } = useExpenseCategories({
    pageNumber: 1,
    pageSize: 200,
    isActive: "true",
    sortBy: "name",
    sortDirection: "asc",
  });

  const { data: currenciesPage, isLoading: currenciesLoading } = useCurrencies({
    pageNumber: 1,
    pageSize: 50,
    isActive: "true",
    sortBy: "code",
    sortDirection: "asc",
  });

  const { data: sarafsData } = useSarafs({
    pageNumber: 1,
    pageSize: 500,
    seasonId,
    sortBy: "name",
    sortDirection: "asc",
  });

  const { data: vendorsPage } = useCustomers({
    pageNumber: 1,
    pageSize: 500,
    type: "vendor",
    seasonId,
    sortBy: "name",
    sortDirection: "asc",
  });

  const sarafOptions = (sarafsData?.items ?? []).map((s) => ({
    value: s.id,
    label: `${s.name} — ${s.phoneNo}`,
  }));

  const vendorOptions = (vendorsPage?.items ?? []).map((vendor) => ({
    value: vendor.id,
    label: `${vendor.name} — ${vendor.phoneNo}`,
  }));

  const categoryOptions = useMemo(
    () =>
      (categoriesPage?.items ?? []).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    [categoriesPage?.items],
  );

  const currencyOptions = useMemo(
    () =>
      (currenciesPage?.items ?? []).map((c) => ({
        value: c.id,
        label: `${c.code} — ${c.name}`,
      })),
    [currenciesPage?.items],
  );

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema) as any,
    defaultValues: {
      billNo: defaultValues?.billNo ?? generatedBillPreview,
      date: defaultValues?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      categoryId: defaultValues?.categoryId ?? "",
      title: defaultValues?.title ?? "",
      amount: defaultValues?.amount ?? "",
      currencyId: defaultValues?.currencyId ?? "",
      settlementMode: defaultValues?.settlementMode ?? "direct",
      vendorId: defaultValues?.vendorId ?? "",
      paymentType: defaultValues?.paymentType ?? "paid",
      paidAmount: defaultValues?.paidAmount ?? "",
      paymentChannel: defaultValues?.paymentChannel ?? "cash",
      sarafId: defaultValues?.sarafId ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });

  const settlementMode = useWatch({ control: form.control, name: "settlementMode" }) || "direct";
  const paymentChannel = useWatch({ control: form.control, name: "paymentChannel" }) || "cash";
  const paymentType = useWatch({ control: form.control, name: "paymentType" }) || "paid";
  const isVendorSettlement = settlementMode === "vendor";
  const showPaymentRoute =
    settlementMode === "direct" ||
    (paymentType !== "remaining" && Boolean(paymentType));

  useEffect(() => {
    if (!defaultValues) {
      form.setValue("billNo", generatedBillPreview);
    }
  }, [defaultValues, form, generatedBillPreview]);

  useEffect(() => {
    if (paymentChannel === "cash") {
      form.setValue("sarafId", "");
    }
  }, [paymentChannel, form]);

  useEffect(() => {
    if (settlementMode === "direct") {
      form.setValue("vendorId", "");
      form.setValue("paymentType", undefined as unknown as ExpenseFormValues["paymentType"]);
      form.setValue("paidAmount", "");
    } else if (!form.getValues("paymentType")) {
      form.setValue("paymentType", "paid");
    }
  }, [form, settlementMode]);

  useEffect(() => {
    if (paymentType !== "partial_paid") {
      form.setValue("paidAmount", "");
    }
  }, [form, paymentType]);

  useEffect(() => {
    const categories = categoriesPage?.items ?? [];
    if (!categories.length) {
      return;
    }

    if (defaultValues?.categoryId) {
      form.setValue("categoryId", defaultValues.categoryId);
      return;
    }

    const preferred =
      categories.find((c) => c.code === "general") ?? categories[0];
    const current = form.getValues("categoryId");

    if (!current) {
      form.setValue("categoryId", preferred.id);
    }
  }, [categoriesPage?.items, defaultValues?.categoryId, form]);

  useEffect(() => {
    if (defaultValues?.currencyId) {
      form.setValue("currencyId", defaultValues.currencyId);
      return;
    }

    const items = currenciesPage?.items ?? [];
    if (!items.length) {
      return;
    }

    const preferred = items.find((c) => c.code === "USD") ?? items[0];
    const current = form.getValues("currencyId");

    if (!current) {
      form.setValue("currencyId", preferred.id);
    }
  }, [currenciesPage?.items, defaultValues?.currencyId, form]);

  const resetForm = () => {
    const categories = categoriesPage?.items ?? [];
    const currencies = currenciesPage?.items ?? [];
    const preferredCategory =
      categories.find((c) => c.code === "general") ?? categories[0];
    const preferredCurrency =
      currencies.find((c) => c.code === "USD") ?? currencies[0];
    form.reset({
      billNo: defaultValues?.billNo ?? generatedBillPreview,
      date: defaultValues?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      categoryId: defaultValues?.categoryId ?? preferredCategory?.id ?? "",
      title: defaultValues?.title ?? "",
      amount: defaultValues?.amount ?? "",
      currencyId: defaultValues?.currencyId ?? preferredCurrency?.id ?? "",
      settlementMode: defaultValues?.settlementMode ?? "direct",
      vendorId: defaultValues?.vendorId ?? "",
      paymentType: defaultValues?.paymentType ?? "paid",
      paidAmount: defaultValues?.paidAmount ?? "",
      paymentChannel: defaultValues?.paymentChannel ?? "cash",
      sarafId: defaultValues?.sarafId ?? "",
      notes: defaultValues?.notes ?? "",
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pe-1">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputField
            name="billNo"
            label={t("common:expense_bill_no")}
            control={form.control}
            disabled
            placeholder={generatedBillPreview}
          />

          <DatePickerField
            name="date"
            label={t("common:date")}
            control={form.control}
            required
          />

          <DynamicLocalSelect
            name="categoryId"
            label={t("common:category")}
            control={form.control}
            required
            options={categoryOptions}
            disabled={categoriesLoading || categoryOptions.length === 0}
            placeholder={t("common:select", { name: t("common:category") })}
          />

          <InputField
            name="title"
            label={t("common:expense_title")}
            control={form.control}
            required
            placeholder={t("common:enter", { name: t("common:expense_title") })}
          />

          <InputField
            name="amount"
            label={t("common:amount")}
            control={form.control}
            required
            type="number"
            characterRestriction="none"
            placeholder={t("common:enter", { name: t("common:amount") })}
          />

          <DynamicLocalSelect
            name="currencyId"
            label={t("common:currency")}
            control={form.control}
            required
            options={currencyOptions}
            disabled={currenciesLoading || currencyOptions.length === 0}
            placeholder={t("common:select", { name: t("common:currency") })}
          />

          <div className="md:col-span-2 space-y-2 rounded-lg border bg-muted/20 p-4">
            <DynamicLocalSelect
              name="settlementMode"
              label={t("common:expense_settlement_mode")}
              control={form.control}
              required
              options={settlementModeOptions}
              placeholder={t("common:select", { name: t("common:expense_settlement_mode") })}
            />
            <p className="text-xs text-muted-foreground">
              {isVendorSettlement
                ? t("common:expense_settlement_vendor_hint")
                : t("common:expense_settlement_direct_hint")}
            </p>
          </div>

          {isVendorSettlement ? (
            <>
              <DynamicLocalSelect
                name="vendorId"
                label={t("common:vendor")}
                control={form.control}
                required
                options={vendorOptions}
                disabled={!seasonId || vendorOptions.length === 0}
                placeholder={t("common:select", { name: t("common:vendor") })}
              />

              <DynamicLocalSelect
                name="paymentType"
                label={t("common:payment_type")}
                control={form.control}
                required
                options={paymentTypeOptions}
                placeholder={t("common:select", { name: t("common:payment_type") })}
              />

              {paymentType === "partial_paid" ? (
                <InputField
                  name="paidAmount"
                  label={t("common:paid_amount")}
                  control={form.control}
                  required
                  type="number"
                  characterRestriction="none"
                  placeholder={t("common:enter", { name: t("common:paid_amount") })}
                />
              ) : null}
            </>
          ) : null}

          {showPaymentRoute ? (
            <div className="md:col-span-2 space-y-2 rounded-lg border bg-muted/20 p-4">
              <DynamicLocalSelect
                name="paymentChannel"
                label={t("common:jwali_payment_mode")}
                control={form.control}
                required
                options={paymentRouteOptions}
                disabled={paymentType === "remaining"}
                placeholder={t("common:select", { name: t("common:jwali_payment_mode") })}
              />
              <p className="text-xs text-muted-foreground">
                {paymentType === "remaining"
                  ? t("common:paddy_seller_route_remaining_hint")
                  : paymentChannel === "saraf"
                    ? t("common:expense_route_saraf_hint")
                    : t("common:expense_route_cash_hint")}
              </p>
            </div>
          ) : null}

          {showPaymentRoute && paymentChannel === "saraf" ? (
            <div className="md:col-span-2">
              <DynamicLocalSelect
                name="sarafId"
                label={t("common:rice_sale_saraf_for_ledger")}
                control={form.control}
                required
                options={sarafOptions}
                disabled={!seasonId || sarafOptions.length === 0}
                placeholder={t("common:select", { name: t("common:rice_sale_saraf_for_ledger") })}
              />
            </div>
          ) : null}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("common:notes")}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  placeholder={t("common:enter", { name: t("common:notes") })}
                  className="min-h-28"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        </div>

        <div className="mt-4 flex shrink-0 gap-3 border-t pt-4">
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              !activeSeason ||
              categoriesLoading ||
              categoryOptions.length === 0 ||
              currenciesLoading ||
              currencyOptions.length === 0
            }
          >
            {isSubmitting
              ? t("common:saving", { name: t("admin:expenses") })
              : t("common:save", { name: t("admin:expenses") })}
          </Button>

          <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
            {t("common:reset")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
