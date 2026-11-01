import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { StatusIndicator } from "@/components/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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
import { formatAvailableStockFromKg, formatWeightFromKg, stockValueClassName } from "@/utils/weightUnit";
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

const MODULE_COLORS = [
  "hsl(152 55% 42%)",
  "hsl(38 90% 48%)",
  "hsl(210 70% 48%)",
  "hsl(280 45% 52%)",
  "hsl(0 65% 52%)",
  "hsl(175 50% 40%)",
  "hsl(25 80% 50%)",
  "hsl(250 55% 55%)",
];

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

  const riceInKg = Number(data.riceWarehouse?.summary.totalInKg ?? 0);
  const riceOutKg = Number(data.riceWarehouse?.summary.totalOutKg ?? 0);
  const riceBookStockKg = riceInKg - riceOutKg;

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

  const cashChartData = activeCurrencyRows.map((row) => ({
    currency: row.currencyCode,
    cashIn: Math.max(0, row.cashIn),
    cashOut: Math.max(0, row.cashOut),
  }));

  const cashChartConfig = {
    cashIn: {
      label: t("common:totalCashIn"),
      color: "hsl(152 55% 40%)",
    },
    cashOut: {
      label: t("common:totalCashOut"),
      color: "hsl(0 65% 50%)",
    },
  } satisfies ChartConfig;

  const stockChartData = [
    {
      key: "riceIn",
      value: Math.max(0, riceInKg),
      fill: "var(--color-riceIn)",
    },
    {
      key: "riceOut",
      value: Math.max(0, riceOutKg),
      fill: "var(--color-riceOut)",
    },
    {
      key: "riceStock",
      value: Math.max(0, riceBookStockKg),
      fill: "var(--color-riceStock)",
    },
    {
      key: "paddyStock",
      value: Math.max(0, availablePaddyStockKg),
      fill: "var(--color-paddyStock)",
    },
  ].filter((item) => item.value > 0);

  const stockChartConfig = {
    riceIn: { label: t("common:general_dashboard_chart_rice_in"), color: "hsl(152 55% 42%)" },
    riceOut: { label: t("common:general_dashboard_chart_rice_out"), color: "hsl(0 65% 52%)" },
    riceStock: { label: t("common:general_dashboard_chart_rice_stock"), color: "hsl(38 90% 48%)" },
    paddyStock: { label: t("common:general_dashboard_chart_paddy_stock"), color: "hsl(210 70% 48%)" },
  } satisfies ChartConfig;

  const moduleChartData = sectionGroups
    .flatMap((group) => group.links)
    .filter((link): link is SectionLink & { value: number } => link.value !== null && link.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map((link) => ({
      name: link.label,
      count: link.value,
    }));

  const moduleChartConfig = {
    count: {
      label: t("common:general_dashboard_chart_modules"),
      color: "hsl(210 70% 48%)",
    },
  } satisfies ChartConfig;

  const hasAnyChart =
    cashChartData.length > 0 || stockChartData.length > 0 || moduleChartData.length > 0;

  return (
    <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <motion.div
        className="flex w-full min-w-0 flex-col gap-6"
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
            <Card className="border-l-4 border-l-violet-500 py-0">
              <CardHeader className="gap-1 px-4 py-3">
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  <span>{season.name}</span>
                  <Badge variant={season.status === "ACTIVE" ? "default" : "secondary"}>
                    {t(`common:${season.status === "ACTIVE" ? "active" : "closed"}`)}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("common:current_season_range", {
                    startDate: dateFormatter(season.startDate),
                    endDate: season.endDate ? dateFormatter(season.endDate) : t("common:ongoing"),
                  })}
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ) : null}

        <motion.section variants={sectionVariants} className="space-y-2">
          <h3 className="text-sm font-semibold">{t("common:general_dashboard_overview_title")}</h3>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="py-0 shadow-none">
              <CardHeader className="gap-0.5 px-3 py-2.5">
                <CardDescription className="text-[11px] leading-none">
                  {t("common:current_stock_balance")}
                </CardDescription>
                <CardTitle
                  className={`text-base leading-tight tabular-nums ${stockValueClassName(riceBookStockKg) ?? ""}`}
                >
                  {formatWeightFromKg(riceBookStockKg, t)}
                </CardTitle>
                <p className="text-[10px] leading-none text-muted-foreground">
                  {t("sidebar:rice_warehouse:rice_warehouse")}
                </p>
              </CardHeader>
            </Card>
            <Card className="py-0 shadow-none">
              <CardHeader className="gap-0.5 px-3 py-2.5">
                <CardDescription className="text-[11px] leading-none">
                  {t("common:available_paddy_stock")}
                </CardDescription>
                <CardTitle className="text-base leading-tight tabular-nums">
                  {formatAvailableStockFromKg(availablePaddyStockKg, t, {
                    locale,
                  })}
                </CardTitle>
                <p className="text-[10px] leading-none text-muted-foreground">
                  {t("sidebar:paddy_warehouse:dashboard")}
                </p>
              </CardHeader>
            </Card>
            <Card className="py-0 shadow-none">
              <CardHeader className="gap-0.5 px-3 py-2.5">
                <CardDescription className="text-[11px] leading-none">
                  {t("common:general_dashboard_net_cash")}
                </CardDescription>
                <CardTitle className="text-base leading-tight tabular-nums">
                  {activeCurrencyRows.length === 1
                    ? `${formatAmount(activeCurrencyRows[0].netBusinessCash, locale)} ${activeCurrencyRows[0].currencyCode}`
                    : activeCurrencyRows.length > 1
                      ? t("common:general_dashboard_multi_currency")
                      : formatAmount(0, locale)}
                </CardTitle>
                <p className="text-[10px] leading-none text-muted-foreground">
                  {t("sidebar:cash:dashboard")}
                </p>
              </CardHeader>
            </Card>
            <Card className="py-0 shadow-none">
              <CardHeader className="gap-0.5 px-3 py-2.5">
                <CardDescription className="text-[11px] leading-none">
                  {t("common:total_employees")}
                </CardDescription>
                <CardTitle className="text-base leading-tight tabular-nums">
                  {formatNumber(data.sectionTotals.employees, locale)}
                </CardTitle>
                <p className="text-[10px] leading-none text-muted-foreground">
                  {t("sidebar:employees:dashboard")}
                </p>
              </CardHeader>
            </Card>
          </div>
        </motion.section>

        {hasAnyChart ? (
          <motion.section variants={sectionVariants} className="space-y-2">
            <h3 className="text-sm font-semibold">{t("common:general_dashboard_charts_title")}</h3>
            <div className="grid gap-3 lg:grid-cols-3">
              <Card className="py-0 shadow-none">
                <CardHeader className="gap-0.5 px-4 pb-0 pt-3">
                  <CardTitle className="text-sm">{t("common:general_dashboard_chart_cash")}</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-3 pt-1">
                  {cashChartData.length === 0 ? (
                    <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                      {t("common:general_dashboard_chart_no_data")}
                    </p>
                  ) : (
                    <ChartContainer config={cashChartConfig} className="aspect-auto h-[200px] w-full">
                      <BarChart data={cashChartData} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="currency" tickLine={false} axisLine={false} tickMargin={6} />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={42}
                          tickFormatter={(value) => formatNumber(value, locale)}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="cashIn" fill="var(--color-cashIn)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cashOut" fill="var(--color-cashOut)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="py-0 shadow-none">
                <CardHeader className="gap-0.5 px-4 pb-0 pt-3">
                  <CardTitle className="text-sm">{t("common:general_dashboard_chart_stock")}</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-3 pt-1">
                  {stockChartData.length === 0 ? (
                    <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                      {t("common:general_dashboard_chart_no_data")}
                    </p>
                  ) : (
                    <ChartContainer config={stockChartConfig} className="aspect-auto h-[200px] w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
                        <Pie
                          data={stockChartData}
                          dataKey="value"
                          nameKey="key"
                          innerRadius={48}
                          outerRadius={72}
                          paddingAngle={2}
                          strokeWidth={2}
                        />
                        <ChartLegend content={<ChartLegendContent nameKey="key" />} />
                      </PieChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="py-0 shadow-none lg:col-span-1">
                <CardHeader className="gap-0.5 px-4 pb-0 pt-3">
                  <CardTitle className="text-sm">{t("common:general_dashboard_chart_modules")}</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-3 pt-1">
                  {moduleChartData.length === 0 ? (
                    <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                      {t("common:general_dashboard_chart_no_data")}
                    </p>
                  ) : (
                    <ChartContainer config={moduleChartConfig} className="aspect-auto h-[200px] w-full">
                      <BarChart
                        data={moduleChartData}
                        layout="vertical"
                        margin={{ left: 4, right: 12, top: 4, bottom: 0 }}
                      >
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => formatNumber(value, locale)}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={88}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={4}
                          tick={{ fontSize: 10 }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {moduleChartData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={MODULE_COLORS[index % MODULE_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.section>
        ) : null}

        <motion.section variants={sectionVariants} className="space-y-2">
          <h3 className="text-sm font-semibold">{t("common:general_dashboard_amounts_owed_title")}</h3>
          <Card className="py-0 shadow-none">
            <CardContent className="grid gap-2 px-3 py-3 sm:grid-cols-2">
              <div className="rounded-md border px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{t("sidebar:rice_warehouse:dashboard")}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums leading-tight">
                  {formatAmount(data.riceWarehouse?.summary.combinedRemainingAmount, locale)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {t("common:general_dashboard_amounts_owed_rice_hint")}
                </p>
              </div>
              <div className="rounded-md border px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{t("sidebar:paddy_warehouse:dashboard")}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums leading-tight">
                  {formatAmount(data.paddyWarehouse?.companyOwned.remainingAmount, locale)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
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
