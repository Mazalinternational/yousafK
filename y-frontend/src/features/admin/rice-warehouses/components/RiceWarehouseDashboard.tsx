import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { StatusIndicator } from "@/components/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sectionVariants, staggerContainerVariants } from "@/lib/motion";
import { dateFormatter } from "@/utils/dataFormatters";
import {
  formatAvailableStockFromKg,
  formatWeightFromKg,
  stockValueClassName,
} from "@/utils/weightUnit";
import { useRiceWarehouseDashboard } from "../hooks";

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

export function RiceWarehouseDashboard() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useRiceWarehouseDashboard();
  const fmtW = (kg: string | number) => formatWeightFromKg(kg, t);
  const fmtStockAvail = (kg: string | number) => formatAvailableStockFromKg(kg, t);

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", {
          name: t("sidebar:rice_warehouse:dashboard"),
        })}
      />
    );
  }

  if (error || !data) {
    return <StatusIndicator statusType="error" message={t("common:error_message")} />;
  }

  const fmtAmt = (v: string | null | undefined) =>
    v != null && v !== "" ? formatAmount(v) : "—";

  const paymentLabel = (m: (typeof data.recentMovements)[number]) => {
    if (m.type === "buyer_sale") {
      const bits: string[] = [];
      if (m.paymentType) {
        bits.push(t(`common:${m.paymentType}`));
      }
      if (m.paymentChannel === "saraf" && m.sarafName) {
        bits.push(`${t("common:rice_sale_route_saraf")}: ${m.sarafName}`);
      } else if (m.paymentChannel === "saraf") {
        bits.push(t("common:rice_sale_route_saraf"));
      } else if (m.paidInCash) {
        bits.push(t("common:rice_sale_cash"));
      }
      return bits.length > 0 ? bits.join(" · ") : "—";
    }
    if (m.type === "rice_entry" && m.paymentType) {
      return t(`common:${m.paymentType}`);
    }
    return "—";
  };

  return (
    <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <motion.div
        className="flex w-full min-w-0 flex-col gap-6"
        initial="initial"
        animate="animate"
        variants={staggerContainerVariants}
      >
        <motion.div variants={sectionVariants} className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">{t("sidebar:rice_warehouse:dashboard")}</h2>
          <p className="text-sm text-muted-foreground">{t("common:rice_dashboard_description")}</p>
        </motion.div>

        <motion.div variants={sectionVariants}>
          {data.season ? (
            <Card className="border-s-4 border-s-sky-500">
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
              {t("common:no_active_season_rice_dashboard_hint")}
            </div>
          )}
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:current_stock_balance")}</CardDescription>
              <CardTitle className={`text-2xl ${stockValueClassName(data.summary.currentStockKg) ?? ""}`}>
                {fmtStockAvail(data.summary.currentStockKg)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:rice_in")}</CardDescription>
              <CardTitle className="text-2xl">{fmtW(data.summary.totalInKg)}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:rice_out")}</CardDescription>
              <CardTitle className="text-2xl">{fmtW(data.summary.totalOutKg)}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:rice_dashboard_farmer_rice_to_issue")}</CardDescription>
              <CardTitle className="text-2xl">
                {fmtW(data.summary.totalFarmerRiceToIssueKg)}
              </CardTitle>
              <CardDescription className="pt-1 text-xs leading-snug">
                {t("common:rice_dashboard_farmer_rice_to_issue_hint", {
                  obligation: fmtW(data.summary.totalFarmerRiceObligationKg),
                  returned: fmtW(data.summary.totalFarmerRiceReturnedKg),
                })}
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:outstanding_amount")}</CardDescription>
              <CardTitle className="text-2xl">
                {formatAmount(data.summary.combinedRemainingAmount)}
              </CardTitle>
              <CardDescription className="pt-1 text-xs leading-snug">
                {t("common:rice_dashboard_outstanding_combined_hint")}
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:rice_dashboard_charity_out")}</CardDescription>
              <CardTitle className="text-2xl">{fmtW(data.summary.charityOutKg)}</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:rice_dashboard_buyer_sales_total")}</CardDescription>
              <CardTitle className="text-xl">{formatAmount(data.summary.buyerSalesTotalAmount)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:rice_dashboard_buyer_sales_paid")}</CardDescription>
              <CardTitle className="text-xl">{formatAmount(data.summary.buyerSalesPaidAmount)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:rice_dashboard_buyer_sales_remaining")}</CardDescription>
              <CardTitle className="text-xl">{formatAmount(data.summary.buyerSalesRemainingAmount)}</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <Card>
            <CardHeader>
              <CardTitle>{t("common:rice_stock_summary")}</CardTitle>
              <CardDescription>{t("common:rice_stock_summary_description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("common:rice_in")}</p>
                <p className="mt-1 text-xl font-semibold">
                  {fmtW(data.summary.totalInKg)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("common:rice_out")}</p>
                <p className="mt-1 text-xl font-semibold">
                  {fmtW(data.summary.totalOutKg)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("common:current_stock_balance")}</p>
                <p className={`mt-1 text-xl font-semibold ${stockValueClassName(data.summary.currentStockKg) ?? ""}`}>
                  {fmtStockAvail(data.summary.currentStockKg)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("common:purchase_value")}</p>
                <p className="mt-1 text-xl font-semibold">
                  {formatAmount(data.summary.totalAmount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("common:paid_amount")}: {formatAmount(data.summary.paidAmount)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <Card>
            <CardHeader>
              <CardTitle>{t("common:rice_variety_stock")}</CardTitle>
              <CardDescription>{t("common:rice_variety_stock_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-start text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="whitespace-nowrap px-3 py-2 text-start font-medium">{t("common:variety")}</th>
                      <th className="whitespace-nowrap px-3 py-2 text-start font-medium">{t("common:rice_stock_from_process")}</th>
                      <th className="whitespace-nowrap px-3 py-2 text-start font-medium">{t("common:rice_warehouse_in")}</th>
                      <th className="whitespace-nowrap px-3 py-2 text-start font-medium">{t("common:rice_in_total")}</th>
                      <th className="whitespace-nowrap px-3 py-2 text-start font-medium">{t("common:rice_dashboard_farmer_rice_obligation")}</th>
                      <th className="whitespace-nowrap px-3 py-2 text-start font-medium">{t("common:rice_dashboard_farmer_rice_returned")}</th>
                      <th className="whitespace-nowrap px-3 py-2 text-start font-medium">{t("common:rice_dashboard_farmer_rice_to_issue")}</th>
                      <th className="whitespace-nowrap px-3 py-2 text-start font-medium">{t("common:current_stock_balance")}</th>
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
                          <td className="whitespace-nowrap px-3 py-3 text-start font-medium">{item.variety}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-start">{fmtW(item.stockFromProcessKg)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-start">{fmtW(item.warehouseInKg ?? "0")}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-start">{fmtW(item.totalInKg)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-start">{fmtW(item.farmerRiceObligationKg)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-start">{fmtW(item.farmerRiceReturnedKg)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-start font-medium">{fmtW(item.farmerRiceToIssueKg)}</td>
                          <td className={`whitespace-nowrap px-3 py-3 text-start font-medium ${stockValueClassName(item.currentStockKg) ?? ""}`}>
                            {fmtStockAvail(item.currentStockKg)}
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

        <motion.div variants={sectionVariants}>
          <Card>
            <CardHeader>
              <CardTitle>{t("common:recent_movements")}</CardTitle>
              <CardDescription>{t("common:recent_movements_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-start text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="px-3 py-2 text-start font-medium">{t("common:date")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:type")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:variety")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:quantity")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:bill_no")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:total_amount")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:paid_amount")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:remaining_amount")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:payment")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentMovements.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-muted-foreground" colSpan={9}>
                          {t("common:no_data")}
                        </td>
                      </tr>
                    ) : (
                      data.recentMovements.map((movement) => (
                        <tr key={movement.id} className="border-b last:border-b-0">
                          <td className="px-3 py-3 text-start">{dateFormatter(movement.date)}</td>
                          <td className="px-3 py-3 text-start">
                            {t(
                              movement.type === "rice_entry"
                                ? "common:rice_entry"
                                : movement.type === "process_rice_in"
                                  ? "common:process_rice_in"
                                  : movement.type === "buyer_sale"
                                    ? "common:buyer_sale"
                                    : movement.type === "rice_charity"
                                      ? "common:rice_charity"
                                      : "common:farmer_exchange_issue"
                            )}
                          </td>
                          <td className="px-3 py-3 text-start">{movement.variety}</td>
                          <td className="px-3 py-3 text-start">{fmtW(movement.quantityKg)}</td>
                          <td className="px-3 py-3 text-start font-mono text-xs">
                            {movement.billNo ?? "—"}
                          </td>
                          <td className="px-3 py-3 text-start tabular-nums">{fmtAmt(movement.totalAmount)}</td>
                          <td className="px-3 py-3 text-start tabular-nums">{fmtAmt(movement.paidAmount)}</td>
                          <td className="px-3 py-3 text-start tabular-nums">{fmtAmt(movement.remainingAmount)}</td>
                          <td className="px-3 py-3 text-start text-muted-foreground">{paymentLabel(movement)}</td>
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
