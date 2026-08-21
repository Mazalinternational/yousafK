import { motion } from "framer-motion";
import { useMemo } from "react";
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
import {
  formatDisplayAmount,
  formatDisplayNumber,
  getDisplayLocale,
} from "@/utils/displayLocale";
import { useExpenseDashboard } from "../hooks";

export function ExpenseDashboard() {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const { data, isLoading, error } = useExpenseDashboard();

  const countCards = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.overview.map((item) => ({
      key: item.label,
      label: t(`common:${item.label}`),
      value: formatDisplayNumber(item.value, locale),
    }));
  }, [data, locale, t]);

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:expenses:dashboard") })}
      />
    );
  }

  if (error || !data) {
    return <StatusIndicator statusType="error" message={t("common:error_message")} />;
  }

  return (
    <motion.div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <motion.div
        className="flex w-full min-w-0 flex-col gap-6"
        initial="initial"
        animate="animate"
        variants={staggerContainerVariants}
      >
        <motion.div variants={sectionVariants} className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">{t("sidebar:expenses:dashboard")}</h2>
          <p className="text-sm text-muted-foreground">{t("common:expenses_dashboard_description")}</p>
        </motion.div>

        <motion.div variants={sectionVariants}>
          {data.season ? (
            <Card className="border-s-4 border-s-rose-500">
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
              {t("common:no_active_season_expense_dashboard_hint")}
            </div>
          )}
        </motion.div>

        <motion.div variants={sectionVariants}>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            {t("common:expense_by_currency_summary")}
          </h3>
          {data.currencyBreakdown.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              {t("common:no_data")}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.currencyBreakdown.map((item) => (
                <Card key={item.currencyCode} className="border-s-4 border-s-rose-500">
                  <CardHeader className="pb-2">
                    <CardDescription>
                      {item.currencyName} ({item.currencyCode})
                    </CardDescription>
                    <CardTitle className="text-2xl tabular-nums">
                      {formatDisplayAmount(item.totalAmount, locale)}{" "}
                      <span className="text-base font-semibold text-muted-foreground">
                        {item.currencyCode}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      {t("common:expense_currency_card_entries", {
                        count: formatDisplayNumber(item.entryCount, locale),
                      })}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-4 md:grid-cols-2">
          {countCards.map((card) => (
            <Card key={card.key}>
              <CardHeader className="pb-2">
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{card.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t("common:expense_category_summary")}</CardTitle>
              <CardDescription>{t("common:expense_category_summary_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>{t("common:category")}</TableHead>
                      <TableHead>{t("common:currency")}</TableHead>
                      <TableHead className="text-end">{t("common:amount")}</TableHead>
                      <TableHead className="text-end">{t("common:entries")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.categoryBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                          {t("common:no_data")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.categoryBreakdown.map((item) => (
                        <TableRow key={`${item.categoryId}-${item.currencyCode}`}>
                          <TableCell>{item.categoryName}</TableCell>
                          <TableCell>{item.currencyCode}</TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatDisplayAmount(item.totalAmount, locale)} {item.currencyCode}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatDisplayNumber(item.entryCount, locale)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("common:recent_expenses")}</CardTitle>
              <CardDescription>{t("common:recent_expenses_description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentExpenses.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t("common:no_data")}</div>
              ) : (
                data.recentExpenses.map((expense) => (
                  <div key={expense.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium tabular-nums">{expense.billNo}</p>
                      <Badge variant="outline">{expense.categoryName}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{expense.title}</p>
                    <p className="mt-2 text-sm tabular-nums">
                      {t("common:expense_recent_amount_date", {
                        amount: formatDisplayAmount(expense.amount, locale),
                        currency: expense.currencyCode,
                        date: dateFormatter(expense.date),
                      })}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
