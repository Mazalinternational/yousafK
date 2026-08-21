import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { StatusIndicator } from "@/components/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

        {data.season ? (
          <motion.div variants={sectionVariants}>
            <Card className="border-l-4 border-l-emerald-500">
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
          </motion.div>
        ) : (
          <motion.div
            variants={sectionVariants}
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {t("common:no_active_season_entering_paddy_dashboard_hint")}
          </motion.div>
        )}

        <motion.div variants={sectionVariants} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <Card key={card.key}>
              <CardHeader className="pb-2">
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="text-2xl">{card.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </motion.div>

        <motion.div variants={sectionVariants}>
          <Card>
            <CardHeader>
              <CardTitle>{t("common:received_from_summary")}</CardTitle>
              <CardDescription>{t("common:received_from_summary_description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("common:farmer")}</p>
                <p className="mt-1 text-2xl font-semibold">{data.sourceSummary.farmerCount}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("common:seller")}</p>
                <p className="mt-1 text-2xl font-semibold">{data.sourceSummary.sellerCount}</p>
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
