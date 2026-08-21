import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LedgerPdfRowActions } from "@/components/LedgerPdfRowActions";
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
import { formatCurrencyTitle } from "@/utils/currencyDisplay";
import {
  formatDisplayAmount,
  formatDisplayNumber,
  getDisplayLocale,
} from "@/utils/displayLocale";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { runLedgerPdfAction } from "@/utils/ledgerPdf";
import { useCashDashboard } from "../hooks";
import type { CashTransaction } from "../schemas/cash";
import {
  buildCashTransactionPdfBlob,
  cashTransactionPdfFileName,
} from "../utils/cashTransactionPdf";

export function CashDashboard() {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const [activeRowPdfKey, setActiveRowPdfKey] = useState<string | null>(null);
  const { data, isLoading, error } = useCashDashboard();

  const handleTransactionPdfAction = useCallback(
    async (transaction: CashTransaction, action: "download" | "share" | "print") => {
      const rowKey = transaction.id;
      setActiveRowPdfKey(`${rowKey}-${action}`);
      const fileName = cashTransactionPdfFileName(transaction);
      const directionLabel =
        transaction.direction === "in" ? t("common:cash_in") : t("common:cash_out");
      const shareTitle = `${directionLabel} — ${formatDisplayAmount(transaction.amount, locale)} ${transaction.currencyCode}`;

      await runLedgerPdfAction(
        action,
        () => buildCashTransactionPdfBlob(transaction, t),
        fileName,
        shareTitle,
        t,
        (error) => toast.error(getErrorMessage(error, t)),
      );
      setActiveRowPdfKey(null);
    },
    [locale, t],
  );

  const transactionCount = useMemo(() => {
    if (!data) {
      return "0";
    }
    const metric = data.overview.find((item) => item.label === "transactionCount");
    return metric
      ? formatDisplayNumber(metric.value, locale)
      : formatDisplayNumber(0, locale);
  }, [data, locale]);

  const activeCurrencyBalances = useMemo(
    () => (data?.currencyBalances ?? []).filter((item) => item.transactionCount > 0),
    [data?.currencyBalances],
  );

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:cash:dashboard") })}
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
          <h2 className="text-lg font-bold">{t("sidebar:cash:dashboard")}</h2>
          <p className="text-sm text-muted-foreground">{t("common:cash_dashboard_description")}</p>
        </motion.div>

        {data.season ? (
          <motion.div variants={sectionVariants}>
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
          </motion.div>
        ) : (
          <motion.div
            variants={sectionVariants}
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
          >
            {t("common:no_active_season_cash_dashboard_hint")}
          </motion.div>
        )}

        <motion.div variants={sectionVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:transactionCount")}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{transactionCount}</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <h3 className="mb-3 text-sm font-medium">{t("common:cash_summary_by_currency")}</h3>
          {activeCurrencyBalances.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              {t("common:no_cash_activity_for_season")}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>{t("common:currency")}</TableHead>
                        <TableHead className="text-end text-emerald-700">
                          {t("common:totalCashIn")}
                        </TableHead>
                        <TableHead className="text-end text-red-700">
                          {t("common:totalCashOut")}
                        </TableHead>
                        <TableHead className="text-end">
                          {t("common:cash_available_balance")}
                        </TableHead>
                        <TableHead className="text-end">{t("common:transactionCount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeCurrencyBalances.map((item) => (
                        <TableRow key={item.currencyId}>
                          <TableCell className="font-medium">
                            {formatCurrencyTitle(item.currencyCode, item.currencyName, t)}
                          </TableCell>
                          <TableCell className="text-end tabular-nums text-emerald-700">
                            {formatDisplayAmount(item.cashIn, locale)} {item.currencyCode}
                          </TableCell>
                          <TableCell className="text-end tabular-nums text-red-700">
                            {formatDisplayAmount(item.cashOut, locale)} {item.currencyCode}
                          </TableCell>
                          <TableCell className="text-end font-semibold tabular-nums">
                            {formatDisplayAmount(item.availableCash ?? item.balance, locale)}{" "}
                            {item.currencyCode}
                          </TableCell>
                          <TableCell className="text-end tabular-nums text-muted-foreground">
                            {formatDisplayNumber(item.transactionCount, locale)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {activeCurrencyBalances.length > 0 ? (
          <motion.div variants={sectionVariants} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeCurrencyBalances.map((item) => (
              <Card key={item.currencyId} className="border-s-4 border-s-emerald-500">
                <CardHeader className="pb-2">
                  <CardDescription>
                    {formatCurrencyTitle(item.currencyCode, item.currencyName, t)}
                  </CardDescription>
                  <CardTitle className="text-xl">{t("common:cash_available_balance")}</CardTitle>
                  <p className="text-2xl font-bold tracking-tight tabular-nums">
                    {formatDisplayAmount(item.availableCash ?? item.balance, locale)}{" "}
                    <span className="text-base font-semibold text-muted-foreground">
                      {item.currencyCode}
                    </span>
                  </p>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-md bg-emerald-50 px-3 py-2 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                    <span>{t("common:totalCashIn")}</span>
                    <span className="font-medium tabular-nums">
                      {formatDisplayAmount(item.cashIn, locale)} {item.currencyCode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-red-900 dark:bg-red-950/40 dark:text-red-100">
                    <span>{t("common:totalCashOut")}</span>
                    <span className="font-medium tabular-nums">
                      {formatDisplayAmount(item.cashOut, locale)} {item.currencyCode}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        ) : null}

        <motion.div variants={sectionVariants}>
          <Card>
            <CardHeader>
              <CardTitle>{t("common:recent_cash_transactions")}</CardTitle>
              <CardDescription>{t("common:recent_cash_transactions_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>{t("common:date")}</TableHead>
                      <TableHead>{t("common:cash_direction")}</TableHead>
                      <TableHead className="text-end">{t("common:amount")}</TableHead>
                      <TableHead>{t("common:currency")}</TableHead>
                      <TableHead>{t("common:notes")}</TableHead>
                      <TableHead className="text-end">{t("common:actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                          {t("common:no_data")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.recentTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{dateFormatter(tx.occurredAt)}</TableCell>
                          <TableCell>
                            {tx.direction === "in" ? t("common:cash_in") : t("common:cash_out")}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatDisplayAmount(tx.amount, locale)} {tx.currencyCode}
                          </TableCell>
                          <TableCell>
                            {formatCurrencyTitle(tx.currencyCode, tx.currencyName, t)}
                          </TableCell>
                          <TableCell>{tx.notes || "—"}</TableCell>
                          <TableCell className="text-end">
                            <LedgerPdfRowActions
                              rowKey={tx.id}
                              activeKey={activeRowPdfKey}
                              onPrint={() => handleTransactionPdfAction(tx, "print")}
                              onShare={() => handleTransactionPdfAction(tx, "share")}
                              onDownload={() => handleTransactionPdfAction(tx, "download")}
                            />
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
