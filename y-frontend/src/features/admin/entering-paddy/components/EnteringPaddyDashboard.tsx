import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Cell, Pie, PieChart } from "recharts";
import { DashboardChartCard, DashboardKpiCard, DashboardSeasonBanner } from "@/components/dashboard-ui";
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
import { sectionVariants, staggerContainerVariants } from "@/lib/motion";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatWeightFromKg } from "@/utils/weightUnit";
import { useEnteringPaddyDashboard } from "../hooks/useEnteringPaddyDashboard";

function formatNumber(value: string | number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    ...options,
  }).format(Number(value));
}

export function EnteringPaddyDashboard() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useEnteringPaddyDashboard();

  const overviewCards = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.overview.map((item) => ({
      key: item.label,
      label: t(`common:${item.label}`),
      value:
        item.unit === "count"
          ? formatNumber(item.value, { maximumFractionDigits: 0 })
          : formatWeightFromKg(item.value, t),
    }));
  }, [data, t]);

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", {
          name: t("sidebar:entering_paddy:dashboard"),
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
          <h2 className="text-lg font-bold">{t("sidebar:entering_paddy:dashboard")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("common:entering_paddy_dashboard_description")}
          </p>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <DashboardSeasonBanner
            season={data.season}
            t={t}
            accentClassName="border-l-emerald-500"
            emptyHint={
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {t("common:no_active_season_entering_paddy_dashboard_hint")}
              </div>
            }
          />
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <DashboardKpiCard key={card.key} label={card.label} value={card.value} />
          ))}
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-3 lg:grid-cols-2">
          <DashboardChartCard title={t("common:received_from_summary")}>
            {(() => {
              const sourceData = [
                {
                  key: "farmer",
                  value: Number(data.sourceSummary.farmerCount),
                  fill: "var(--color-farmer)",
                },
                {
                  key: "seller",
                  value: Number(data.sourceSummary.sellerCount),
                  fill: "var(--color-seller)",
                },
              ].filter((row) => row.value > 0);
              const config = {
                farmer: { label: t("common:farmer"), color: "hsl(152 55% 42%)" },
                seller: { label: t("common:seller"), color: "hsl(38 90% 48%)" },
              } satisfies ChartConfig;
              if (sourceData.length === 0) {
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
                      data={sourceData}
                      dataKey="value"
                      nameKey="key"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {sourceData.map((row) => (
                        <Cell key={row.key} fill={row.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="key" />} />
                  </PieChart>
                </ChartContainer>
              );
            })()}
          </DashboardChartCard>
          <Card className="py-0 shadow-none">
            <CardHeader className="gap-0.5 px-4 pb-0 pt-3">
              <CardTitle className="text-sm">{t("common:received_from_summary")}</CardTitle>
              <CardDescription className="text-xs">
                {t("common:received_from_summary_description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 px-3 py-3 sm:grid-cols-2">
              <div className="rounded-md border px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{t("common:farmer")}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums leading-tight">
                  {data.sourceSummary.farmerCount}
                </p>
              </div>
              <div className="rounded-md border px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{t("common:seller")}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums leading-tight">
                  {data.sourceSummary.sellerCount}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <Card>
          <CardHeader>
            <CardTitle>{t("common:recent_entries")}</CardTitle>
            <CardDescription>{t("common:recent_entering_paddy_description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">{t("common:bill_no")}</th>
                    <th className="px-3 py-2 font-medium">{t("common:date")}</th>
                    <th className="px-3 py-2 font-medium">{t("common:paddy_owner")}</th>
                    <th className="px-3 py-2 font-medium">{t("common:variety")}</th>
                    <th className="px-3 py-2 font-medium">{t("common:total_weight_kg")}</th>
                    <th className="px-3 py-2 font-medium">{t("common:received_from")}</th>
                    <th className="px-3 py-2 font-medium">{t("common:driver_name")}</th>
                    <th className="px-3 py-2 font-medium">{t("common:car_plate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentEntries.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-muted-foreground" colSpan={8}>
                        {t("common:no_data")}
                      </td>
                    </tr>
                  ) : (
                    data.recentEntries.map((entry) => (
                      <tr key={entry.id} className="border-b last:border-b-0">
                        <td className="px-3 py-3">{entry.billNo}</td>
                        <td className="px-3 py-3">{dateFormatter(entry.date)}</td>
                        <td className="px-3 py-3">{entry.paddyOwner}</td>
                        <td className="px-3 py-3">{entry.variety}</td>
                        <td className="px-3 py-3">{formatWeightFromKg(entry.totalWeightKg, t)}</td>
                        <td className="px-3 py-3">{t(`common:${entry.receivedFrom}`)}</td>
                        <td className="px-3 py-3">{entry.driverName}</td>
                        <td className="px-3 py-3">{entry.carPlate}</td>
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
