import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SimpleTablePagination } from "@/components/simple-table-pagination";
import {
  DashboardChartCard,
  DashboardKpiCard,
  DashboardSeasonBanner,
} from "@/components/dashboard-ui";
import { StatusIndicator } from "@/components/status-indicator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { sectionVariants, staggerContainerVariants } from "@/lib/motion";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatWeightFromKg, stockValueClassName } from "@/utils/weightUnit";
import { useRiceWarehouseDashboard } from "../hooks";
import type { RiceDashboard } from "../schemas/rice-dashboard";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

function formatNumber(value: string | number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
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
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const fmtW = (kg: string | number) => formatWeightFromKg(kg, t);
  const bookStockKg = Number(data?.summary.totalInKg ?? 0) - Number(data?.summary.totalOutKg ?? 0);

  const typeLabel = (
    type: "rice_entry" | "process_rice_in" | "farmer_exchange_issue" | "buyer_sale" | "rice_charity",
  ) =>
    t(
      type === "rice_entry"
        ? "common:rice_entry"
        : type === "process_rice_in"
          ? "common:process_rice_in"
          : type === "buyer_sale"
            ? "common:buyer_sale"
            : type === "rice_charity"
              ? "common:rice_charity"
              : "common:farmer_exchange_issue",
    );

  const paymentLabel = (m: RiceDashboard["recentMovements"][number]) => {
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

  const movements = useMemo(() => {
    const rows = data?.recentMovements ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((movement) => {
      const haystack = [
        typeLabel(movement.type),
        movement.type,
        movement.ownerName,
        movement.variety,
        movement.billNo,
        movement.totalAmount,
        movement.paidAmount,
        movement.remainingAmount,
        movement.paymentType,
        movement.paymentChannel,
        movement.sarafName,
        paymentLabel(movement),
        dateFormatter(movement.date),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data?.recentMovements, searchQuery, t]);

  const pageCount = Math.max(1, Math.ceil(movements.length / pageSize));

  useEffect(() => {
    setPageNumber(1);
  }, [data?.season?.id, searchQuery]);

  useEffect(() => {
    if (pageNumber > pageCount) {
      setPageNumber(pageCount);
    }
  }, [pageNumber, pageCount]);

  const pagedMovements = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return movements.slice(start, start + pageSize);
  }, [movements, pageNumber, pageSize]);

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
          <DashboardSeasonBanner
            season={data.season}
            t={t}
            accentClassName="border-l-sky-500"
            emptyHint={
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {t("common:no_active_season_rice_dashboard_hint")}
              </div>
            }
          />
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardKpiCard
            label={t("common:current_stock_balance")}
            value={fmtW(bookStockKg)}
            valueClassName={stockValueClassName(bookStockKg) ?? undefined}
          />
          <DashboardKpiCard label={t("common:rice_in")} value={fmtW(data.summary.totalInKg)} />
          <DashboardKpiCard label={t("common:rice_out")} value={fmtW(data.summary.totalOutKg)} />
          <DashboardKpiCard
            label={t("common:rice_dashboard_farmer_rice_to_issue")}
            value={fmtW(data.summary.totalFarmerRiceToIssueKg)}
            hint={t("common:rice_dashboard_farmer_rice_to_issue_hint", {
              obligation: fmtW(data.summary.totalFarmerRiceObligationKg),
              returned: fmtW(data.summary.totalFarmerRiceReturnedKg),
            })}
          />
          <DashboardKpiCard
            label={t("common:outstanding_amount")}
            value={formatAmount(data.summary.combinedRemainingAmount)}
            hint={t("common:rice_dashboard_outstanding_combined_hint")}
          />
          <DashboardKpiCard
            label={t("common:rice_dashboard_charity_out")}
            value={fmtW(data.summary.charityOutKg)}
          />
          <DashboardKpiCard
            label={t("common:rice_dashboard_buyer_sales_total")}
            value={formatAmount(data.summary.buyerSalesTotalAmount)}
          />
          <DashboardKpiCard
            label={t("common:rice_dashboard_buyer_sales_remaining")}
            value={formatAmount(data.summary.buyerSalesRemainingAmount)}
          />
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-3 lg:grid-cols-2">
          <DashboardChartCard title={t("common:general_dashboard_chart_stock")}>
            {(() => {
              const stockData = [
                {
                  key: "riceIn",
                  value: Math.max(0, Number(data.summary.totalInKg)),
                  fill: "var(--color-riceIn)",
                },
                {
                  key: "riceOut",
                  value: Math.max(0, Number(data.summary.totalOutKg)),
                  fill: "var(--color-riceOut)",
                },
                {
                  key: "riceStock",
                  value: Math.max(0, bookStockKg),
                  fill: "var(--color-riceStock)",
                },
              ].filter((row) => row.value > 0);
              const config = {
                riceIn: { label: t("common:rice_in"), color: "hsl(152 55% 42%)" },
                riceOut: { label: t("common:rice_out"), color: "hsl(0 65% 52%)" },
                riceStock: {
                  label: t("common:current_stock_balance"),
                  color: "hsl(38 90% 48%)",
                },
              } satisfies ChartConfig;
              if (!stockData.length) {
                return (
                  <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                    {t("common:general_dashboard_chart_no_data")}
                  </p>
                );
              }
              return (
                <ChartContainer config={config} className="aspect-auto h-[200px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
                    <Pie
                      data={stockData}
                      dataKey="value"
                      nameKey="key"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {stockData.map((row) => (
                        <Cell key={row.key} fill={row.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="key" />} />
                  </PieChart>
                </ChartContainer>
              );
            })()}
          </DashboardChartCard>
          <DashboardChartCard title={t("common:rice_dashboard_buyer_sales_total")}>
            {(() => {
              const salesData = [
                {
                  name: t("common:rice_dashboard_buyer_sales_paid"),
                  amount: Math.max(0, Number(data.summary.buyerSalesPaidAmount)),
                },
                {
                  name: t("common:rice_dashboard_buyer_sales_remaining"),
                  amount: Math.max(0, Number(data.summary.buyerSalesRemainingAmount)),
                },
              ];
              const config = {
                amount: { label: t("common:amount"), color: "hsl(210 70% 48%)" },
              } satisfies ChartConfig;
              return (
                <ChartContainer config={config} className="aspect-auto h-[200px] w-full">
                  <BarChart data={salesData} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                    <YAxis tickLine={false} axisLine={false} width={40} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              );
            })()}
          </DashboardChartCard>
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
                <p className={`mt-1 text-xl font-semibold ${stockValueClassName(bookStockKg) ?? ""}`}>
                  {fmtW(bookStockKg)}
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
                            {fmtW(item.currentStockKg)}
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
            <CardContent className="space-y-4">
              <div className="relative max-w-md">
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("common:recent_movements_search_placeholder")}
                  className="ps-9"
                  aria-label={t("common:search")}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-start text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="px-3 py-2 text-start font-medium">{t("common:date")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:type")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("common:name")}</th>
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
                    {pagedMovements.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-muted-foreground" colSpan={10}>
                          {t("common:no_data")}
                        </td>
                      </tr>
                    ) : (
                      pagedMovements.map((movement) => (
                        <tr key={movement.id} className="border-b last:border-b-0">
                          <td className="px-3 py-3 text-start">{dateFormatter(movement.date)}</td>
                          <td className="px-3 py-3 text-start">{typeLabel(movement.type)}</td>
                          <td className="px-3 py-3 text-start font-medium">
                            {movement.type === "process_rice_in"
                              ? "—"
                              : movement.ownerName?.trim() || "—"}
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
              <SimpleTablePagination
                pageNumber={pageNumber}
                pageSize={pageSize}
                totalCount={movements.length}
                onChange={({ pageNumber: nextPage, pageSize: nextSize }) => {
                  setPageNumber(nextPage);
                  setPageSize(nextSize);
                }}
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
