import { zodResolver } from "@hookform/resolvers/zod";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useCurrencies } from "../../currencies/hooks/useCurrencies";
import { useSarafs } from "../../sarafi/hooks/useSarafs";
import {
  STORE_PAYMENT_CHANNEL_OPTIONS,
  createStoreSaleFormSchema,
  type StoreEntry,
  type StoreSaleFormValues,
} from "../schemas/store";
import { getStoreDisplayStatus } from "../utils/storeStatus";

interface StoreSaleFormProps {
  entry: StoreEntry;
  seasonId?: string | null;
  onSubmit: (values: StoreSaleFormValues) => void;
  isSubmitting?: boolean;
}

export function StoreSaleForm({ entry, seasonId, onSubmit, isSubmitting }: StoreSaleFormProps) {
  const { t } = useTranslation();
  const maxSoldWeight = Number(entry.remainingWeight);
  const schema = useMemo(() => createStoreSaleFormSchema(maxSoldWeight), [maxSoldWeight]);

  const { data: sarafsData } = useSarafs({
    pageNumber: 1,
    pageSize: 500,
    seasonId: seasonId ?? undefined,
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

  const form = useForm<StoreSaleFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      soldWeight: "",
      saleAmount: "",
      paymentChannel: "cash",
      sarafId: "",
      sarafLedgerCurrencyId: "",
    },
  });

  const paymentChannel = useWatch({ control: form.control, name: "paymentChannel" }) || "cash";

  useEffect(() => {
    if (paymentChannel === "cash") {
      form.setValue("sarafId", "");
      form.setValue("sarafLedgerCurrencyId", "");
    }
  }, [form, paymentChannel]);

  const sarafOptions = (sarafsData?.items ?? []).map((s) => ({
    value: s.id,
    label: `${s.name} — ${s.phoneNo}`,
  }));
  const currencyOptions = (currenciesData?.items ?? []).map((c) => ({
    value: c.id,
    label: `${c.code} — ${c.name}`,
  }));
  const paymentRouteOptions = STORE_PAYMENT_CHANNEL_OPTIONS.map((route) => ({
    value: route,
    label:
      route === "cash" ? t("common:rice_sale_route_cash") : t("common:rice_sale_route_saraf"),
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <EntrySummary entry={entry} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputField
            name="soldWeight"
            label={t("common:store_sell_weight")}
            control={form.control}
            required
            type="number"
            characterRestriction="none"
            placeholder={t("common:store_sell_weight_max", {
              weight: entry.remainingWeight,
              unit: t(`common:${entry.unit}`),
            })}
          />

          <InputField
            name="saleAmount"
            label={t("common:sale_amount")}
            control={form.control}
            required
            type="number"
            characterRestriction="none"
          />

          <div className="md:col-span-2 space-y-2 rounded-lg border bg-muted/20 p-4">
            <DynamicLocalSelect
              name="paymentChannel"
              label={t("common:rice_sale_where_money_goes")}
              control={form.control}
              required
              options={paymentRouteOptions}
              placeholder={t("common:select", { name: t("common:rice_sale_where_money_goes") })}
            />
            <p className="text-xs text-muted-foreground">
              {paymentChannel === "saraf"
                ? t("common:rice_sale_route_saraf_hint")
                : t("common:rice_sale_route_cash_hint")}
            </p>
          </div>

          {paymentChannel === "saraf" ? (
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
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting || maxSoldWeight <= 0}>
            {isSubmitting ? t("common:saving", { name: t("common:sell") }) : t("common:sell")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function EntrySummary({ entry }: { entry: StoreEntry }) {
  const { t } = useTranslation();
  const displayStatus = getStoreDisplayStatus(entry);

  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
      <SummaryItem label={t("common:store_entry_bill_no")} value={entry.billNo} />
      <SummaryItem label={t("common:reference_process_bill_no")} value={entry.processBillNo} />
      <SummaryItem label={t("common:variety")} value={entry.variety} />
      <SummaryItem
        label={t("common:store_stock_total")}
        value={`${entry.weight} ${t(`common:${entry.unit}`)}`}
      />
      <SummaryItem
        label={t("common:store_stock_sold")}
        value={`${entry.soldWeight} ${t(`common:${entry.unit}`)}`}
      />
      <SummaryItem
        label={t("common:store_stock_remaining")}
        value={`${entry.remainingWeight} ${t(`common:${entry.unit}`)}`}
      />
      <SummaryItem label={t("common:status")} value={t(`common:store_status_${displayStatus}`)} />
      <SummaryItem
        label={t("common:total_sale_amount")}
        value={Number(entry.saleAmount) > 0 ? String(entry.saleAmount) : "—"}
      />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
