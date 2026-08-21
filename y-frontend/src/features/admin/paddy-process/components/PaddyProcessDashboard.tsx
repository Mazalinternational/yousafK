import { motion } from "framer-motion";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { StatusIndicator } from "@/components/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sectionVariants, staggerContainerVariants } from "@/lib/motion";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatWeightFromKg } from "@/utils/weightUnit";
import { usePaddyProcessDashboard } from "../hooks";
import { PaddyProcessRecordsTable } from "./PaddyProcessRecordsTable";

function formatNumber(value: string | number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    ...options,
  }).format(Number(value));
}

export function PaddyProcessDashboard() {
  const { t } = useTranslation();
  const { data, isLoading, error } = usePaddyProcessDashboard();

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
          : item.unit === "ton"
            ? formatWeightFromKg(Number(item.value) * 1000, t)
            : formatWeightFromKg(item.value, t),
    }));
  }, [data, t]);

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:paddy_process:dashboard") })}
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
        <motion.div
          variants={sectionVariants}
          className="flex flex-wrap items-start justify-between gap-3"
        >
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">{t("sidebar:paddy_process:dashboard")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("common:paddy_process_dashboard_description")}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/yk/paddy_process">{t("sidebar:paddy_process:records")}</Link>
          </Button>
        </motion.div>

        <motion.div variants={sectionVariants}>
          {data.season ? (
            <Card className="border-s-4 border-s-orange-500">
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
              {t("common:no_active_season_paddy_process_dashboard_hint")}
            </div>
          )}
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <Card key={card.key}>
              <CardHeader className="pb-2">
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{card.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </motion.div>

        <motion.div variants={sectionVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("common:recent_processes")}</CardTitle>
              <CardDescription>{t("common:recent_processes_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <PaddyProcessRecordsTable processes={data.recentProcesses} />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
