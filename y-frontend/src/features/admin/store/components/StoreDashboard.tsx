import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { StatusIndicator } from "@/components/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sectionVariants, staggerContainerVariants } from "@/lib/motion";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatDisplayNumber, getDisplayLocale } from "@/utils/displayLocale";
import {
  formatQuantityWithUnit,
  formatWeightFromKg,
  stockValueClassName,
} from "@/utils/weightUnit";
import { useStoreDashboard } from "../hooks/useStoreDashboard";
import type { StoreType } from "../schemas/store";
import { isPooledStoreType } from "../utils/storePooledTypes";

const STORE_PATHS: Record<StoreType, string> = {
  short_green: "/yk/stores/short-green",
  regection: "/yk/stores/regection",
  broken_rice: "/yk/stores/broken-rice",
  waste: "/yk/stores/waste",
};

export function StoreDashboard() {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const { data, isLoading, error } = useStoreDashboard();

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:store:dashboard") })}
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
          <h2 className="text-lg font-bold">{t("sidebar:store:dashboard")}</h2>
          <p className="text-sm text-muted-foreground">{t("common:store_dashboard_description")}</p>
        </motion.div>

        <motion.div variants={sectionVariants}>
          {data.season ? (
            <Card className="border-s-4 border-s-emerald-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center gap-3">
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
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
              {t("common:no_active_season_store_hint")}
            </div>
          )}
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.overview.map((item) => (
            <Link key={item.storeType} to={STORE_PATHS[item.storeType as StoreType]}>
              <Card className="h-full transition-colors hover:bg-muted/30">
                <CardHeader className="pb-2">
                  <CardDescription>{t(`common:${item.storeType}`)}</CardDescription>
                  <CardTitle
                    className={`text-base tabular-nums ${stockValueClassName(item.remainingWeightKg ?? item.totalWeightKg) ?? ""}`}
                  >
                    {formatWeightFromKg(item.remainingWeightKg ?? item.totalWeightKg, t)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {t("common:store_stock_total")}: {formatWeightFromKg(item.totalWeightKg, t)}
                  <br />
                  {t("common:store_entries_count", {
                    count: formatDisplayNumber(item.entryCount, locale),
                  })}
                </CardContent>
              </Card>
            </Link>
          ))}
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-4 lg:grid-cols-2">
          {data.varietyByStoreType.map((block) => {
            const pooled = isPooledStoreType(block.storeType as StoreType);

            return (
              <Card key={block.storeType}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t(`common:${block.storeType}`)}</CardTitle>
                  <CardDescription>
                    {pooled
                      ? t("common:store_pooled_stock_description")
                      : t("common:store_variety_stock_description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {block.varieties.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("common:store_variety_stock_empty")}
                    </p>
                  ) : pooled ? (
                    <PooledDashboardStock row={block.varieties[0]} locale={locale} />
                  ) : (
                    <div className="space-y-2">
                      {block.varieties.map((row) => (
                        <div
                          key={`${block.storeType}-${row.variety}`}
                          className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                        >
                          <span className="font-medium">{row.variety}</span>
                          <span className="text-end text-muted-foreground tabular-nums">
                            {formatWeightFromKg(row.totalWeightKg, t)} ·{" "}
                            {t("common:store_entries_count", {
                              count: formatDisplayNumber(row.entryCount, locale),
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        <motion.div variants={sectionVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("common:recent_activity")}</CardTitle>
              <CardDescription>{t("common:store_recent_entries_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("common:no_data")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>{t("common:store")}</TableHead>
                        <TableHead>{t("common:store_entry_bill_no")}</TableHead>
                        <TableHead>{t("common:variety")}</TableHead>
                        <TableHead className="text-end">{t("common:weight")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentEntries.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{t(`common:${row.storeType}`)}</TableCell>
                          <TableCell className="tabular-nums">{row.billNo}</TableCell>
                          <TableCell>{row.variety}</TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatQuantityWithUnit(row.weight, row.unit, t)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

function PooledDashboardStock({
  row,
  locale,
}: {
  row: {
    totalWeightKg: string;
    availableWeightKg: string;
    remainingWeightKg?: string;
    entryCount: number;
  };
  locale: string;
}) {
  const { t } = useTranslation();
  const remainingKg = row.remainingWeightKg ?? row.availableWeightKg;

  return (
    <div className="rounded-md border px-3 py-2 text-sm">
      <p className="font-medium">{t("common:store_pooled_stock_label")}</p>
      <p className="mt-1 text-muted-foreground tabular-nums">
        {t("common:store_stock_total")}: {formatWeightFromKg(row.totalWeightKg, t)} ·{" "}
        <span className={stockValueClassName(remainingKg)}>
          {t("common:store_stock_remaining")}: {formatWeightFromKg(remainingKg, t)}
        </span>{" "}
        ·{" "}
        {t("common:store_entries_count", {
          count: formatDisplayNumber(row.entryCount, locale),
        })}
      </p>
    </div>
  );
}
