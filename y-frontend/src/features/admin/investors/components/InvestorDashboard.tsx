import { motion } from "framer-motion";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DashboardKpiCard, DashboardSeasonBanner } from "@/components/dashboard-ui";
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
import {
  formatDisplayAmount,
  formatDisplayNumber,
  getDisplayLocale,
} from "@/utils/displayLocale";
import { useInvestorDashboard } from "../hooks";

export function InvestorDashboard() {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const { data, isLoading, error } = useInvestorDashboard();

  const overviewCards = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.overview.map((item) => ({
      key: item.label,
      label: t(`common:${item.label}`),
      value:
        item.unit === "count"
          ? formatDisplayNumber(item.value, locale)
          : item.unit === "percent"
            ? `${formatDisplayAmount(item.value, locale)}%`
            : formatDisplayAmount(item.value, locale),
    }));
  }, [data, locale, t]);

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:investor:dashboard") })}
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
          <h2 className="text-lg font-bold">{t("sidebar:investor:dashboard")}</h2>
          <p className="text-sm text-muted-foreground">{t("common:investor_dashboard_description")}</p>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <DashboardSeasonBanner
            season={data.season}
            t={t}
            accentClassName="border-l-emerald-500"
            emptyHint={
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
                {t("common:no_active_season_investor_dashboard_hint")}
              </div>
            }
          />
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {overviewCards.map((card) => (
            <DashboardKpiCard key={card.key} label={card.label} value={card.value} />
          ))}
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <DashboardKpiCard
            label={t("common:total_sales")}
            value={formatDisplayAmount(data.totals.totalSales, locale)}
          />
          <DashboardKpiCard
            label={t("common:total_expenses")}
            value={formatDisplayAmount(data.totals.totalExpenses, locale)}
          />
          <DashboardKpiCard
            label={t("common:total_purchases")}
            value={formatDisplayAmount(data.totals.totalPurchases, locale)}
          />
          <DashboardKpiCard
            label={t("common:net_profit")}
            value={formatDisplayAmount(data.totals.netProfit, locale)}
          />
          <DashboardKpiCard
            label={t("common:distributable_profit")}
            value={formatDisplayAmount(data.totals.distributableProfit, locale)}
          />
        </motion.div>

        <motion.div variants={sectionVariants}>
          <Card>
            <CardHeader>
              <CardTitle>{t("common:investor_profit_share_breakdown")}</CardTitle>
              <CardDescription>{t("common:investor_profit_share_breakdown_description")}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>{t("common:name")}</TableHead>
                      <TableHead className="text-end">{t("common:share_percentage")}</TableHead>
                      <TableHead className="text-end">{t("common:invested_amount")}</TableHead>
                      <TableHead>{t("common:status")}</TableHead>
                      <TableHead className="text-end">{t("common:profit_share_amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.investors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                          {t("common:no_data")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.investors.map((investor) => (
                        <TableRow key={investor.id}>
                          <TableCell className="font-medium">{investor.name}</TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatDisplayAmount(investor.sharePercentage, locale)}%
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatDisplayAmount(investor.investedAmount, locale)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={investor.isActive ? "default" : "secondary"}>
                              {investor.isActive ? t("common:active") : t("common:inactive")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatDisplayAmount(investor.projectedShareAmount, locale)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
