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
import { formatAvailableStockFromKg } from "@/utils/weightUnit";
import { getDisplayLocale } from "@/utils/displayLocale";
import { useGeneralDashboard } from "../hooks/useGeneralDashboard";
import { buildCurrencyCashFlowRows } from "../utils/buildCurrencyCashFlow";

function formatAmount(
  value: string | number | null | undefined,
  locale: string,
) {
  if (value === null || value === undefined || value === "") return "0.00";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatNumber(
  value: string | number | null | undefined,
  locale: string,
) {
  if (value === null || value === undefined || value === "") return "0";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

type SectionLink = { label: string; value: number | null; to: string };

type SectionGroup = {
  titleKey: string;
  links: SectionLink[];
};

export function GeneralDashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const { data, isLoading, error } = useGeneralDashboard();

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:dashboard:general") })}
      />
    );
  }

  if (error || !data) {
    return <StatusIndicator statusType="error" message={t("common:error_message")} />;
  }

  const season =
    data.riceWarehouse?.season ??
    data.paddyWarehouse?.season ??
    data.enteringPaddy?.season ??
    data.expenses?.season ??
    data.employees?.season;

  const currencyRows = buildCurrencyCashFlowRows(data);
  const buyerTransferRows = data.buyerTransfersSummary?.byCurrency ?? [];
  const hasPaidOnBehalfTransfers = buyerTransferRows.some(
    (row) => Number(row.paidOnBehalfTotal) > 0,
  );
  const hasReceivedOnBehalfTransfers = buyerTransferRows.some(
    (row) => Number(row.receivedOnBehalfTotal) > 0,
  );
  const activeCurrencyRows = currencyRows.filter(
    (row) =>
      row.cashIn > 0 ||
      row.cashOut > 0 ||
      row.netBusinessCash !== 0 ||
      row.expensesCash > 0 ||
      row.paddyBoughtCash > 0 ||
      row.jwaliCash > 0 ||
      row.sarafCashIn > 0 ||
      row.sarafCashOut > 0,
  );

  const availablePaddyStockKg =
    Number(data.paddyWarehouse?.companyOwned.availableQuantityKg ?? 0) +
    Number(data.paddyWarehouse?.farmerOwned.availableQuantityKg ?? 0);

  const sectionGroups: SectionGroup[] = [
    {
      titleKey: "general_dashboard_group_setup",
      links: [
        { label: t("sidebar:season:season"), value: data.sectionTotals.seasons, to: "/yk/seasons" },
        { label: t("sidebar:veriety:veriety"), value: data.sectionTotals.varieties, to: "/yk/verieties/rice" },
        { label: t("sidebar:customer:customer"), value: data.sectionTotals.customers, to: "/yk/customers" },
        { label: t("sidebar:expenses:currencies"), value: data.sectionTotals.currencies, to: "/yk/currencies" },
      ],
    },
    {
      titleKey: "general_dashboard_group_paddy",
      links: [
        {
          label: t("sidebar:entering_paddy:entering_paddy"),
          value: data.sectionTotals.enteringPaddy,
          to: "/yk/entering-paddy",
        },
        {
          label: t("sidebar:paddy_warehouse:company_owned"),
          value: data.sectionTotals.companyPaddy,
          to: "/yk/campany_owned_paddy",
        },
        {
          label: t("sidebar:paddy_warehouse:farmer_owned"),
          value: data.sectionTotals.farmerPaddy,
          to: "/yk/farmer_owned_paddy",
        },
        {
          label: t("sidebar:paddy_process:paddy_process"),
          value: data.sectionTotals.paddyProcess,
          to: "/yk/paddy_process",
        },
      ],
    },
    {
      titleKey: "general_dashboard_group_rice",
      links: [
        { label: t("sidebar:rice_warehouse:rice"), value: data.sectionTotals.riceWarehouse, to: "/yk/rice_warehouse" },
        { label: t("sidebar:rice_warehouse:process_rice"), value: data.sectionTotals.processRice, to: "/yk/process-rice" },
        { label: t("sidebar:rice_warehouse:rice_sales"), value: data.sectionTotals.riceSales, to: "/yk/rice-sales" },
        { label: t("sidebar:store:store"), value: data.sectionTotals.stores, to: "/yk/stores/short-green" },
      ],
    },
    {
      titleKey: "general_dashboard_group_finance",
      links: [
        { label: t("sidebar:expenses:expenses"), value: data.sectionTotals.expenses, to: "/yk/expenses" },
        { label: t("sidebar:jwali:jwali"), value: data.sectionTotals.jwali, to: "/yk/jwali" },
        { label: t("sidebar:sarafi:sarafi"), value: data.sectionTotals.sarafi, to: "/yk/sarafi" },
        { label: t("sidebar:investor:investors"), value: data.sectionTotals.investors, to: "/yk/investors" },
        { label: t("sidebar:employees:employees"), value: data.sectionTotals.employees, to: "/yk/employees" },
      ],
    },
  ];

  return (
    <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <motion.div
        className="flex w-full min-w-0 flex-col gap-8"
        initial="initial"
        animate="animate"
        variants={staggerContainerVariants}
      >
        <motion.div variants={sectionVariants} className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">{t("sidebar:dashboard:general")}</h2>
          <p className="text-sm text-muted-foreground">{t("common:general_dashboard_description")}</p>
        </motion.div>

        {season ? (
          <motion.div variants={sectionVariants}>
            <Card className="border-l-4 border-l-violet-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <span>{season.name}</span>
                  <Badge variant={season.status === "ACTIVE" ? "default" : "secondary"}>
                    {t(`common:${season.status === "ACTIVE" ? "active" : "closed"}`)}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {t("common:current_season_range", {
                    startDate: dateFormatter(season.startDate),
                    endDate: season.endDate ? dateFormatter(season.endDate) : t("common:ongoing"),
                  })}
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ) : null}

        <motion.section variants={sectionVariants} className="space-y-3">
          <h3 className="text-sm font-semibold">{t("common:general_dashboard_overview_title")}</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("common:current_stock_balance")}</CardDescription>
                <CardTitle className="text-xl">
                  {formatAvailableStockFromKg(data.riceWarehouse?.summary.currentStockKg ?? 0, t, {
                    locale,
                  })}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{t("sidebar:rice_warehouse:rice_warehouse")}</p>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("common:available_paddy_stock")}</CardDescription>
                <CardTitle className="text-xl">
                  {formatAvailableStockFromKg(availablePaddyStockKg, t, {
                    locale,
                  })}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{t("sidebar:paddy_warehouse:dashboard")}</p>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("common:general_dashboard_net_cash")}</CardDescription>
                <CardTitle className="text-xl">
                  {activeCurrencyRows.length === 1
                    ? `${formatAmount(activeCurrencyRows[0].netBusinessCash, locale)} ${activeCurrencyRows[0].currencyCode}`
                    : activeCurrencyRows.length > 1
                      ? t("common:general_dashboard_multi_currency")
                      : formatAmount(0, locale)}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{t("sidebar:cash:dashboard")}</p>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("common:total_employees")}</CardDescription>
                <CardTitle className="text-xl">{formatNumber(data.sectionTotals.employees, locale)}</CardTitle>
                <p className="text-xs text-muted-foreground">{t("sidebar:employees:dashboard")}</p>
              </CardHeader>
            </Card>
          </div>
        </motion.section>

        <motion.section variants={sectionVariants} className="space-y-3">
          <h3 className="text-sm font-semibold">{t("common:general_dashboard_amounts_owed_title")}</h3>
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("sidebar:rice_warehouse:dashboard")}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {formatAmount(data.riceWarehouse?.summary.combinedRemainingAmount, locale)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("common:general_dashboard_amounts_owed_rice_hint")}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t("sidebar:paddy_warehouse:dashboard")}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {formatAmount(data.paddyWarehouse?.companyOwned.remainingAmount, locale)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("common:general_dashboard_amounts_owed_paddy_hint")}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {(hasPaidOnBehalfTransfers || hasReceivedOnBehalfTransfers) ? (
          <motion.section variants={sectionVariants} className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">
                {t("common:general_dashboard_buyer_transfers_title")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("common:general_dashboard_buyer_transfers_description")}
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    {t("common:buyer_pay_on_behalf_by_currency")}
                  </CardTitle>
                  <CardDescription>
                    {t("common:buyer_pay_on_behalf_by_currency_description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {!hasPaidOnBehalfTransfers ? (
                    <p className="px-6 pb-6 text-sm text-muted-foreground">
                      {t("common:buyer_no_pay_on_behalf_activity")}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead>{t("common:currency")}</TableHead>
                            <TableHead className="text-right">
                              {t("common:buyer_transfer_paid_on_behalf")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {buyerTransferRows
                            .filter((row) => Number(row.paidOnBehalfTotal) > 0)
                            .map((row) => (
                              <TableRow key={`paid-${row.currencyId}`}>
                                <TableCell className="font-medium">
                                  {row.currencyCode}
                                  <span className="ml-2 text-muted-foreground">{row.currencyName}</span>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatAmount(row.paidOnBehalfTotal, locale)} {row.currencyCode}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    {t("common:buyer_received_on_behalf_by_currency")}
                  </CardTitle>
                  <CardDescription>
                    {t("common:buyer_received_on_behalf_by_currency_description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {!hasReceivedOnBehalfTransfers ? (
                    <p className="px-6 pb-6 text-sm text-muted-foreground">
                      {t("common:buyer_no_received_on_behalf_activity")}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead>{t("common:currency")}</TableHead>
                            <TableHead className="text-right">
                              {t("common:buyer_transfer_received_on_behalf")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {buyerTransferRows
                            .filter((row) => Number(row.receivedOnBehalfTotal) > 0)
                            .map((row) => (
                              <TableRow key={`received-${row.currencyId}`}>
                                <TableCell className="font-medium">
                                  {row.currencyCode}
                                  <span className="ml-2 text-muted-foreground">{row.currencyName}</span>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatAmount(row.receivedOnBehalfTotal, locale)} {row.currencyCode}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.section>
        ) : null}

        <motion.section variants={sectionVariants} className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">{t("common:general_dashboard_cash_flow_title")}</h3>
            <p className="text-xs text-muted-foreground">{t("common:general_dashboard_cash_simple_description")}</p>
          </div>

          {activeCurrencyRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("common:general_dashboard_no_currency_activity")}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>{t("common:currency")}</TableHead>
                        <TableHead className="text-right text-emerald-700">
                          {t("common:totalCashIn")}
                        </TableHead>
                        <TableHead className="text-right text-red-700">{t("common:totalCashOut")}</TableHead>
                        <TableHead className="text-right">{t("common:cash_available_balance")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeCurrencyRows.map((row) => (
                        <TableRow key={row.currencyCode}>
                          <TableCell className="font-medium">
                            {row.currencyCode}
                            <span className="ml-2 text-muted-foreground">{row.currencyName}</span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-emerald-700">
                            {formatAmount(row.cashIn, locale)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-red-700">
                            {formatAmount(row.cashOut, locale)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">
                            {formatAmount(row.netBusinessCash, locale)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeCurrencyRows.some(
            (row) =>
              row.expensesCash > 0 ||
              row.paddyBoughtCash > 0 ||
              row.jwaliCash > 0 ||
              row.sarafCashIn > 0 ||
              row.sarafCashOut > 0,
          ) ? (
            <details className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
              <summary className="cursor-pointer font-medium text-muted-foreground">
                {t("common:general_dashboard_cash_details_toggle")}
              </summary>
              <div className="mt-3 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common:currency")}</TableHead>
                      <TableHead className="text-right">{t("common:general_dashboard_expenses_cash")}</TableHead>
                      <TableHead className="text-right">{t("common:general_dashboard_paddy_bought_cash")}</TableHead>
                      <TableHead className="text-right">{t("common:general_dashboard_jwali_cash")}</TableHead>
                      <TableHead className="text-right">{t("common:general_dashboard_sarafi_cash_in")}</TableHead>
                      <TableHead className="text-right">{t("common:general_dashboard_sarafi_cash_out")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeCurrencyRows.map((row) => (
                      <TableRow key={`detail-${row.currencyCode}`}>
                        <TableCell className="font-medium">{row.currencyCode}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatAmount(row.expensesCash, locale)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatAmount(row.paddyBoughtCash, locale)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatAmount(row.jwaliCash, locale)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatAmount(row.sarafCashIn, locale)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatAmount(row.sarafCashOut, locale)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </details>
          ) : null}
        </motion.section>

        <motion.section variants={sectionVariants} className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">{t("common:general_dashboard_sections_title")}</h3>
            <p className="text-xs text-muted-foreground">{t("common:general_dashboard_sections_description")}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {sectionGroups.map((group) => (
              <Card key={group.titleKey}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t(`common:${group.titleKey}`)}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {group.links.map((section) => (
                    <Link
                      key={section.to}
                      to={section.to}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                    >
                      <span className="text-muted-foreground">{section.label}</span>
                      <span className="font-semibold tabular-nums">
                        {section.value === null
                          ? t("common:general_dashboard_unavailable_count")
                          : formatNumber(section.value, locale)}
                      </span>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
