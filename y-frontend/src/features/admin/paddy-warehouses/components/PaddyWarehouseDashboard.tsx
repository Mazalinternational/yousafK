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
import { formatAvailableStockFromKg, formatWeightFromKg } from "@/utils/weightUnit";
import { usePaddyWarehouseDashboard } from "../hooks";
import { Cell, Pie, PieChart } from "recharts";

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
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const fmtW = (kg: string | number) => formatWeightFromKg(kg, t);
  const fmtStock = (kg: string | number) => formatAvailableStockFromKg(kg, t);

  const typeLabel = (type: "company_purchase" | "farmer_exchange" | "process") =>
    t(
      type === "company_purchase"
        ? "common:company_purchase"
        : type === "process"
          ? "common:paddy_process"
          : "common:farmer_exchange",
    );

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

  const movements = useMemo(() => {
    const rows = data?.recentMovements ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((movement) => {
      const haystack = [
        typeLabel(movement.type),
        movement.type,
        movement.ownerName,
        movement.paddyVariety,
        movement.riceVariety,
        movement.totalAmount,
        movement.paymentType,
        movement.paymentChannel,
        movement.sarafName,
        companyPaymentLabel(movement),
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
          <DashboardSeasonBanner
            season={data.season}
            t={t}
            accentClassName="border-l-emerald-500"
            emptyHint={
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {t("common:no_active_season_dashboard_hint")}
              </div>
            }
          />
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

        <motion.div variants={sectionVariants} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardKpiCard
            label={t("common:available_paddy_stock")}
            value={fmtStock(
              Number(data.companyOwned.availableQuantityKg) +
                Number(data.farmerOwned.availableQuantityKg),
            )}
          />
          <DashboardKpiCard
            label={t("common:processed_paddy")}
            value={fmtW(data.companyOwned.processedQuantityKg)}
          />
          <DashboardKpiCard
            label={t("common:outstanding_amount")}
            value={formatAmount(data.companyOwned.remainingAmount)}
          />
          <DashboardKpiCard
            label={t("common:exchange_balance")}
            value={fmtW(data.farmerOwned.exchangeBalanceKg)}
          />
        </motion.div>

        <motion.div variants={sectionVariants}>
          <DashboardChartCard title={t("common:general_dashboard_chart_stock")}>
            {(() => {
              const stockData = [
                {
                  key: "company",
                  value: Math.max(0, Number(data.companyOwned.availableQuantityKg)),
                  fill: "var(--color-company)",
                },
                {
                  key: "farmer",
                  value: Math.max(0, Number(data.farmerOwned.availableQuantityKg)),
                  fill: "var(--color-farmer)",
                },
                {
                  key: "processed",
                  value: Math.max(0, Number(data.companyOwned.processedQuantityKg)),
                  fill: "var(--color-processed)",
                },
              ].filter((row) => row.value > 0);
              const config = {
                company: { label: t("common:company_owned"), color: "hsl(152 55% 42%)" },
                farmer: { label: t("common:farmer_owned"), color: "hsl(38 90% 48%)" },
                processed: { label: t("common:processed_paddy"), color: "hsl(210 70% 48%)" },
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
                    {pagedMovements.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-muted-foreground" colSpan={7}>
                          {t("common:no_data")}
                        </td>
                      </tr>
                    ) : (
                      pagedMovements.map((movement) => (
                        <tr key={movement.id} className="border-b last:border-b-0">
                          <td className="px-3 py-3 text-start">{dateFormatter(movement.date)}</td>
                          <td className="px-3 py-3 text-start">{typeLabel(movement.type)}</td>
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
