import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { StatusIndicator } from "@/components/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sectionVariants, staggerContainerVariants } from "@/lib/motion";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatAvailableStockFromKg, formatWeightFromKg } from "@/utils/weightUnit";
import { usePaddyWarehouseDashboard } from "../hooks";

function formatNumber(value: string | number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    ...options,
  }).format(Number(value));
}

function formatAmount(value: string | number) {
  return formatNumber(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PaddyWarehouseDashboard() {
  const { t } = useTranslation();
  const { data, isLoading, error } = usePaddyWarehouseDashboard();

  const fmtW = (kg: string | number) => formatWeightFromKg(kg, t);
  const fmtStock = (kg: string | number) => formatAvailableStockFromKg(kg, t);

  const companyPaymentLabel = (movement: {
    paymentType?: string | null;
    paymentChannel?: "cash" | "saraf" | null;
    sarafName?: string | null;
  }) => {
    const bits: string[] = [];
    if (movement.paymentType) {
      bits.push(t(`common:${movement.paymentType}`));
    }
    if (movement.paymentChannel === "saraf" && movement.sarafName) {
      bits.push(`${t("common:rice_sale_route_saraf")}: ${movement.sarafName}`);
    } else if (movement.paymentChannel === "saraf") {
      bits.push(t("common:rice_sale_route_saraf"));
    } else if (movement.paymentChannel === "cash") {
      bits.push(t("common:rice_sale_route_cash"));
    }
    return bits.length > 0 ? bits.join(" · ") : "—";
  };

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", {
          name: t("sidebar:paddy_warehouse:dashboard"),
        })}
      />
    );
  }

  if (error || !data) {
    return <StatusIndicator statusType="error" message={t("common:error_message")} />;
  }

  return (
    <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <motion.div
        className="flex w-full min-w-0 flex-col gap-6"
        initial="initial"
        animate="animate"
        variants={staggerContainerVariants}
      >
        <motion.div variants={sectionVariants} className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">{t("sidebar:paddy_warehouse:dashboard")}</h2>
          <p className="text-sm text-muted-foreground">{t("common:paddy_dashboard_description")}</p>
        </motion.div>

        <motion.div variants={sectionVariants}>
          {data.season ? (
            <Card className="border-s-4 border-s-emerald-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3">
                  <span>{data.season.name}</span>
                  <Badge variant={data.season.status === "ACTIVE" ? "default" : "secondary"}>
                    {t(`common:${data.season.status === "ACTIVE" ? "active" : "closed"}`)}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {t("common:current_season_range", {
                    startDate: dateFormatter(data.season.startDate),
                    endDate: data.season.endDate
                      ? dateFormatter(data.season.endDate)
                      : t("common:ongoing"),
                  })}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t("common:no_active_season_dashboard_hint")}
            </div>
          )}
        </motion.div>

        <motion.div variants={sectionVariants}>
          <Card>
            <CardHeader>
              <CardTitle>{t("common:paddy_current_stock_by_variety")}</CardTitle>
              <CardDescription>
                {t("common:paddy_current_stock_by_variety_description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-start text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="px-3 py-2 text-start font-medium">{t("common:variety")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:company_owned")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:processed_paddy")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:company_available")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:farmer_owned")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:rice_issued")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:exchange_balance")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:current_stock_balance")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.varietyBreakdown.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-muted-foreground" colSpan={8}>
                          {t("common:no_data")}
                        </td>
                      </tr>
                    ) : (
                      data.varietyBreakdown.map((item) => (
                        <tr key={item.variety} className="border-b last:border-b-0">
                          <td className="px-3 py-3 text-start font-medium">{item.variety}</td>
                          <td className="px-3 py-3 text-start">{fmtW(item.companyWeightKg)}</td>
                          <td className="px-3 py-3 text-start">{fmtW(item.processedQuantityKg)}</td>
                          <td className="px-3 py-3 text-start">{fmtStock(item.companyAvailableKg)}</td>
                          <td className="px-3 py-3 text-start">{fmtW(item.farmerWeightKg)}</td>
                          <td className="px-3 py-3 text-start">{fmtW(item.farmerRiceOutKg)}</td>
                          <td className="px-3 py-3 text-start">{fmtStock(item.farmerExchangeBalanceKg)}</td>
                          <td className="px-3 py-3 text-start font-semibold">{fmtStock(item.currentStockKg)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:available_paddy_stock")}</CardDescription>
              <CardTitle className="text-2xl">
                {fmtStock(
                  Number(data.companyOwned.availableQuantityKg) +
                    Number(data.farmerOwned.availableQuantityKg),
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:processed_paddy")}</CardDescription>
              <CardTitle className="text-2xl">
                {fmtW(data.companyOwned.processedQuantityKg)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:outstanding_amount")}</CardDescription>
              <CardTitle className="text-2xl">
                {formatAmount(data.companyOwned.remainingAmount)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:exchange_balance")}</CardDescription>
              <CardTitle className="text-2xl">
                {fmtW(data.farmerOwned.exchangeBalanceKg)}
              </CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("common:company_owned_stock")}</CardTitle>
              <CardDescription>{t("common:company_owned_stock_description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("common:quantity")}</p>
                <p className="mt-1 text-xl font-semibold">{fmtW(data.companyOwned.totalQuantityKg)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("common:available_paddy_stock")}</p>
                <p className="mt-1 text-xl font-semibold">
                  {fmtW(data.companyOwned.availableQuantityKg)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("common:purchase_value")}</p>
                <p className="mt-1 text-xl font-semibold">
                  {formatAmount(data.companyOwned.totalAmount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("common:paid_amount")}: {formatAmount(data.companyOwned.paidAmount)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("common:processed_paddy")}</p>
                <p className="mt-1 text-xl font-semibold">
                  {fmtW(data.companyOwned.processedQuantityKg)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("common:process_entries_with_count", {
                    count: data.companyOwned.processEntryCount,
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("common:farmer_owned_stock")}</CardTitle>
              <CardDescription>{t("common:farmer_owned_stock_description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("common:paddy_received")}</p>
                <p className="mt-1 text-xl font-semibold">
                  {fmtW(data.farmerOwned.totalQuantityKg)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("common:available_paddy_stock")}</p>
                <p className="mt-1 text-xl font-semibold">
                  {fmtStock(data.farmerOwned.availableQuantityKg)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("common:rice_issued")}</p>
                <p className="mt-1 text-xl font-semibold">
                  {fmtW(data.farmerOwned.totalRiceOutKg)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("common:processed_paddy")}</p>
                <p className="mt-1 text-xl font-semibold">
                  {fmtW(data.farmerOwned.processedQuantityKg)}
                </p>
              </div>
              <div className="rounded-lg border p-4 sm:col-span-2">
                <p className="text-sm text-muted-foreground">{t("common:exchange_balance")}</p>
                <p className="mt-1 text-xl font-semibold">
                  {fmtW(data.farmerOwned.exchangeBalanceKg)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <Card>
            <CardHeader>
              <CardTitle>{t("common:recent_movements")}</CardTitle>
              <CardDescription>{t("common:recent_movements_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-start text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="px-3 py-2 text-start font-medium">{t("common:date")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:type")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:owner_name")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:paddy_variety")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:paddy_quantity")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:total_amount")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:payment")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentMovements.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-muted-foreground" colSpan={7}>
                          {t("common:no_data")}
                        </td>
                      </tr>
                    ) : (
                      data.recentMovements.map((movement) => (
                        <tr key={movement.id} className="border-b last:border-b-0">
                          <td className="px-3 py-3 text-start">{dateFormatter(movement.date)}</td>
                          <td className="px-3 py-3 text-start">
                            {t(
                              movement.type === "company_purchase"
                                ? "common:company_purchase"
                                : movement.type === "process"
                                  ? "common:paddy_process"
                                  : "common:farmer_exchange"
                            )}
                          </td>
                          <td className="px-3 py-3 text-start">{movement.ownerName}</td>
                          <td className="px-3 py-3 text-start">{movement.paddyVariety}</td>
                          <td className="px-3 py-3 text-start">{fmtW(movement.paddyQuantityKg)}</td>
                          <td className="px-3 py-3 text-start">
                            {movement.totalAmount ? formatAmount(movement.totalAmount) : "-"}
                          </td>
                          <td className="px-3 py-3 text-start text-muted-foreground">
                            {movement.type === "company_purchase"
                              ? companyPaymentLabel(movement)
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
