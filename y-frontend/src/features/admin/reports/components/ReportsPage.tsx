import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { TFunction } from "i18next";
import { motion } from "framer-motion";
import {
  Building2,
  CalendarDays,
  Factory,
  FileBarChart2,
  FileDown,
  Loader2,
  Package2,
  PackageOpen,
  Printer,
  Receipt,
  Share2,
  ShoppingCart,
  Truck,
  Users,
  Wheat,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import DatePickerComponent from "@/components/date-picker";
import { StatusIndicator } from "@/components/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { sectionVariants, staggerContainerVariants } from "@/lib/motion";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatCurrencyTitle } from "@/utils/currencyDisplay";
import {
  formatDisplayAmount,
  formatDisplayNumber,
  getDisplayLocale,
} from "@/utils/displayLocale";
import {
  formatKilogramsAsSeer,
  formatSeerQuantity,
  isKilogramReportFieldKey,
  isSeerReportFieldKey,
} from "@/utils/weightUnit";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { saveBlob } from "@/utils/saveBlob";
import type { ReportPreset, ReportSummary } from "../schemas/reports";
import { useReportSummary } from "../hooks/useReportSummary";
import {
  buildFullReportOutput,
  buildReportSharePlainText,
  formatReportCellForDisplay,
  type ReportUiTable,
} from "../utils/build-report-pdf-payload";
import { buildReportPdfBlob, openReportPdfPrintPreview } from "./report-pdf-document";

function formatUtcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatNumber(
  value: string | number | null | undefined,
  locale: string,
  options?: Intl.NumberFormatOptions,
) {
  if (value === null || value === undefined || value === "") return "—";
  if (options?.minimumFractionDigits === 2 || options?.maximumFractionDigits === 2) {
    return formatDisplayAmount(value, locale);
  }
  return formatDisplayNumber(value, locale);
}

function formatReportWeightMetric(
  fieldKey: string,
  value: string | number | null | undefined,
  t: TFunction,
  locale: string,
) {
  if (value === null || value === undefined || value === "") return "—";
  if (isKilogramReportFieldKey(fieldKey)) {
    return formatKilogramsAsSeer(value, t, locale);
  }
  if (isSeerReportFieldKey(fieldKey)) {
    return formatSeerQuantity(value, t, locale);
  }
  return formatNumber(value, locale);
}

function isNumericReportColumn(key: string): boolean {
  if (key.includes("Amount") || key === "amount" || key === "rate" || key === "ratePerBag") return true;
  if (key === "bagCount") return true;
  if (key === "paidAmount" || key === "remainingAmount") return true;
  return isKilogramReportFieldKey(key) || isSeerReportFieldKey(key);
}

function reportPdfFileName(summary: ReportSummary): string {
  return `report-${summary.range.preset}-${formatUtcYmd(new Date(summary.range.start))}.pdf`;
}

const STORE_TYPE_TO_SIDEBAR: Record<string, string> = {
  short_green: "sidebar:store:short_green",
  regection: "sidebar:store:regection",
  broken_rice: "sidebar:store:broken_rice",
  waste: "sidebar:store:waste",
};

const STORE_TYPE_ORDER = ["short_green", "regection", "broken_rice", "waste"] as const;

function MetricTile({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-3 transition-colors hover:bg-muted/40">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1.5 text-2xl font-semibold tabular-nums tracking-tight", valueClassName)}>{value}</p>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-transparent px-2 py-1.5 text-sm transition-colors hover:border-border/80 hover:bg-muted/30">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function ReportSectionCard({
  borderClass,
  iconWrapClass,
  icon,
  title,
  description,
  children,
}: {
  borderClass: string;
  iconWrapClass: string;
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("overflow-hidden shadow-sm transition-shadow hover:shadow-md", borderClass)}>
      <CardHeader className="space-y-0 border-b border-border/50 bg-muted/20 pb-4 pt-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/40 shadow-xs",
              iconWrapClass,
            )}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="text-base leading-tight">{title}</CardTitle>
            <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">{children}</CardContent>
    </Card>
  );
}

function ReportDetailEntriesTable({
  t,
  tableId,
  tablesById,
}: {
  t: TFunction;
  tableId: string;
  tablesById: Record<string, ReportUiTable>;
}) {
  const table = tablesById[tableId];
  if (!table?.rows.length) return null;
  const { columns, rows } = table;
  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("common:report_detail_records")}
      </p>
      <div className="max-h-[min(28rem,60vh)] overflow-auto rounded-xl border border-border/60 bg-card shadow-xs print:max-h-none">
        <table className="w-full min-w-[640px] text-xs">
          <thead className="sticky top-0 z-10 border-b border-border/80 bg-muted/80 backdrop-blur-sm print:static">
            <tr className="text-start text-muted-foreground">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap px-2 py-2 font-semibold text-foreground/80",
                    isNumericReportColumn(c.key) && "text-end",
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row, ri) => (
              <tr key={ri} className="transition-colors hover:bg-muted/40">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "max-w-[14rem] truncate px-2 py-1.5 tabular-nums text-foreground/90 print:whitespace-normal print:max-w-none",
                      isNumericReportColumn(c.key) && "text-end",
                    )}
                    title={formatReportCellForDisplay(c.key, row[c.key], t, row)}
                  >
                    {formatReportCellForDisplay(c.key, row[c.key], t, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportDataTable({
  head,
  colSpan,
  empty,
  emptyLabel,
  rows,
}: {
  head: ReactNode;
  colSpan: number;
  empty: boolean;
  emptyLabel: string;
  rows: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs">
      <table className="w-full min-w-[280px] text-sm">
        <thead className="border-b border-border/80 bg-muted/60">
          <tr className="text-start text-muted-foreground">{head}</tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {empty ? (
            <tr>
              <td className="px-3 py-8 text-center text-muted-foreground" colSpan={colSpan}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const [preset, setPreset] = useState<ReportPreset>("day");
  const [anchorDate, setAnchorDate] = useState(() => formatUtcYmd(new Date()));
  const [pdfBusy, setPdfBusy] = useState(false);

  const { data, isLoading, error, isFetching } = useReportSummary(preset, anchorDate);

  const rangeLabel = useMemo(() => {
    if (!data) return "";
    return `${dateFormatter(data.range.start)} — ${dateFormatter(data.range.end)}`;
  }, [data]);

  const presetLabel = useMemo(() => {
    if (preset === "day") return t("common:report_preset_day");
    if (preset === "week") return t("common:report_preset_week");
    return t("common:report_preset_month");
  }, [preset, t]);

  const { pdfPayload, tablesById } = useMemo(() => {
    if (!data) return { pdfPayload: null, tablesById: {} as Record<string, ReportUiTable> };
    const built = buildFullReportOutput(data, t, { rangeLabel, presetLabel, anchorDate });
    return {
      pdfPayload: built.pdf,
      tablesById: Object.fromEntries(built.uiTables.map((tbl) => [tbl.id, tbl])) as Record<string, ReportUiTable>,
    };
  }, [data, t, rangeLabel, presetLabel, anchorDate]);

  const runWithPdfBlob = useCallback(
    async (fn: (blob: Blob) => Promise<void> | void) => {
      if (!data || !pdfPayload) return;
      setPdfBusy(true);
      try {
        const blob = await buildReportPdfBlob(pdfPayload, t);
        await fn(blob);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        toast.error(getErrorMessage(err, t));
      } finally {
        setPdfBusy(false);
      }
    },
    [data, pdfPayload, t],
  );

  const handleDownloadPdf = useCallback(async () => {
    if (!data) return;
    await runWithPdfBlob(async (blob) => {
      saveBlob(blob, reportPdfFileName(data));
      toast.success(t("common:report_pdf_downloaded"));
    });
  }, [data, runWithPdfBlob, t]);

  const handlePrintPdf = useCallback(async () => {
    await runWithPdfBlob(async (blob) => {
      openReportPdfPrintPreview(blob);
    });
  }, [runWithPdfBlob]);

  const handleShare = useCallback(async () => {
    if (!data || !pdfPayload) return;
    await runWithPdfBlob(async (blob) => {
      const name = reportPdfFileName(data);
      const pdfFile = new File([blob], name, { type: "application/pdf" });

      if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({
          title: t("sidebar:reports:reports"),
          files: [pdfFile],
        });
        toast.success(t("common:report_share_done"));
        return;
      }

      const text = buildReportSharePlainText(pdfPayload);
      if (navigator.share) {
        await navigator.share({ title: t("sidebar:reports:reports"), text });
        toast.success(t("common:report_share_done"));
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success(t("common:report_share_copied"));
        return;
      }

      saveBlob(blob, name);
      toast.info(t("common:report_share_pdf_fallback"));
    });
  }, [data, pdfPayload, runWithPdfBlob, t]);

  if (isLoading && !data) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:reports:reports") })}
      />
    );
  }

  if (error || !data) {
    return <StatusIndicator statusType="error" message={t("common:error_message")} />;
  }

  const s = data.sections;

  return (
    <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <motion.div
        className="flex w-full min-w-0 flex-col gap-6"
        initial="initial"
        animate="animate"
        variants={staggerContainerVariants}
      >
        {/* Hero */}
        <motion.div
          variants={sectionVariants}
          className="print:hidden relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-muted/40 via-background to-violet-500/[0.07] p-6 shadow-sm dark:to-violet-500/10"
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-400/15"
            aria-hidden
          />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-600/10 text-violet-700 shadow-inner dark:text-violet-300">
                <FileBarChart2 className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight md:text-2xl">{t("sidebar:reports:reports")}</h2>
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    UTC
                  </Badge>
                </div>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {t("common:reports_page_description")}
                </p>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button
                type="button"
                size="lg"
                variant="default"
                className="gap-2 shadow-md"
                disabled={pdfBusy}
                onClick={() => void handleDownloadPdf()}
              >
                {pdfBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <FileDown className="h-4 w-4" aria-hidden />
                )}
                {t("common:report_download_pdf")}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="gap-2 border-border/80 bg-background/80 shadow-xs backdrop-blur-sm"
                disabled={pdfBusy}
                onClick={() => void handlePrintPdf()}
              >
                <Printer className="h-4 w-4" aria-hidden />
                {t("common:report_print")}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="gap-2 border-border/80 bg-background/80 shadow-xs backdrop-blur-sm"
                disabled={pdfBusy}
                onClick={() => void handleShare()}
              >
                <Share2 className="h-4 w-4" aria-hidden />
                {t("common:report_share")}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div variants={sectionVariants}>
          <Card
            className={cn(
              "print:hidden overflow-hidden border-border/70 shadow-sm transition-shadow",
              isFetching && "border-primary/30 ring-2 ring-primary/15",
            )}
          >
            <CardHeader className="border-b border-border/60 bg-muted/30 py-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold tracking-tight">{t("common:filter")}</CardTitle>
                {isFetching ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    {t("common:report_updating")}
                  </span>
                ) : null}
              </div>
              <CardDescription className="text-xs">{t("common:report_in_period")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 pt-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-muted-foreground">{t("common:report_period")}</Label>
                <ToggleGroup
                  type="single"
                  value={preset}
                  variant="outline"
                  onValueChange={(v) => {
                    if (v === "day" || v === "week" || v === "month") setPreset(v);
                  }}
                  className="justify-start shadow-xs"
                >
                  <ToggleGroupItem value="day" className="min-w-[4.5rem] px-4" aria-label="day">
                    {t("common:report_preset_day")}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="week" className="min-w-[4.5rem] px-4" aria-label="week">
                    {t("common:report_preset_week")}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="month" className="min-w-[4.5rem] px-4" aria-label="month">
                    {t("common:report_preset_month")}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex w-full max-w-xs flex-col gap-2">
                <Label htmlFor="report-anchor" className="text-xs font-medium text-muted-foreground">
                  {t("common:report_reference_date")}
                </Label>
                <DatePickerComponent
                  name="report-anchor"
                  value={anchorDate}
                  onChange={setAnchorDate}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div id="report-print-root" className="flex flex-col gap-5 md:gap-6">
          <motion.div variants={sectionVariants} className="print:mb-4">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground shadow-xs sm:gap-3">
              <CalendarDays className="h-4 w-4 shrink-0 text-foreground/70" aria-hidden />
              <Badge variant="secondary" className="font-medium">
                {presetLabel}
              </Badge>
              <span className="hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden />
              <span className="min-w-0 tabular-nums text-foreground/90">{rangeLabel}</span>
            </div>
          </motion.div>

          {!data.season ? (
            <motion.div
              variants={sectionVariants}
              className="rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50 to-amber-50/50 px-4 py-3.5 text-sm text-amber-950 shadow-sm dark:border-amber-900/50 dark:from-amber-950/40 dark:to-amber-950/20 dark:text-amber-100"
            >
              {t("common:no_active_season_dashboard_hint")}
            </motion.div>
          ) : (
            <motion.div variants={sectionVariants}>
              <Card className="gap-0 overflow-hidden border-s-4 border-s-violet-500 py-0 shadow-sm">
                <CardHeader className="gap-2.5 border-b border-border/50 bg-muted/15 px-6 py-5">
                  <CardTitle className="flex flex-wrap items-center gap-3 text-lg leading-snug">
                    <span>{data.season.name}</span>
                    <Badge variant={data.season.status === "ACTIVE" ? "default" : "secondary"}>
                      {t(`common:${data.season.status === "ACTIVE" ? "active" : "closed"}`)}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
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
          )}

          {data.season && typeof data.entryLimit === "number" && data.entryLimit > 0 ? (
            <motion.div
              variants={sectionVariants}
              className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-50"
            >
              {t("common:report_entry_limit_note", { limit: formatDisplayNumber(data.entryLimit, locale) })}
            </motion.div>
          ) : null}

          <motion.div variants={sectionVariants} className="grid gap-5 md:grid-cols-2">
            {s.entering_paddy ? (
              <ReportSectionCard
                borderClass="border-s-4 border-s-emerald-500"
                iconWrapClass="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                icon={<Truck className="h-5 w-5" strokeWidth={1.75} />}
                title={t("sidebar:entering_paddy:entering_paddy")}
                description={t("common:report_in_period")}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricTile label={t("common:entries")} value={formatDisplayNumber(s.entering_paddy.recordCount, locale)} />
                  <MetricTile
                    label={t("common:totalWeightKg")}
                    value={formatReportWeightMetric("totalWeightKg", s.entering_paddy.totalWeightKg, t, locale)}
                  />
                </div>
                <ReportDetailEntriesTable t={t} tableId="entering_paddy" tablesById={tablesById} />
              </ReportSectionCard>
            ) : null}

            {s.paddy_warehouse ? (
              <ReportSectionCard
                borderClass="border-s-4 border-s-amber-500"
                iconWrapClass="bg-amber-500/10 text-amber-800 dark:text-amber-400"
                icon={<Building2 className="h-5 w-5" strokeWidth={1.75} />}
                title={t("sidebar:paddy_warehouse:paddy_warehouse")}
                description={t("common:report_in_period")}
              >
                <div className="space-y-4">
                  {s.paddy_warehouse.companyOwned ? (
                    <div className="rounded-xl border border-border/60 bg-muted/15 p-3">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("sidebar:paddy_warehouse:company_owned")}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <MetricTile label={t("common:entries")} value={formatDisplayNumber(s.paddy_warehouse.companyOwned.recordCount, locale)} />
                        <MetricTile
                          label={t("common:quantity")}
                          value={formatReportWeightMetric("totalQuantity", s.paddy_warehouse.companyOwned.totalQuantity, t, locale)}
                        />
                        <MetricTile
                          label={t("common:amount")}
                          value={formatNumber(s.paddy_warehouse.companyOwned.totalAmount, locale, {
                            minimumFractionDigits: 2,
                          })}
                        />
                      </div>
                      <ReportDetailEntriesTable t={t} tableId="paddy_company" tablesById={tablesById} />
                    </div>
                  ) : null}
                  {s.paddy_warehouse.farmerOwned ? (
                    <div className="rounded-xl border border-border/60 bg-muted/15 p-3">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("sidebar:paddy_warehouse:farmer_owned")}
                      </p>
                      <div className="space-y-1">
                        <StatLine label={t("common:entries")} value={formatDisplayNumber(s.paddy_warehouse.farmerOwned.recordCount, locale)} />
                        <StatLine
                          label={t("common:totalStockKg")}
                          value={formatReportWeightMetric("totalPaddyQuantity", s.paddy_warehouse.farmerOwned.totalPaddyQuantity, t, locale)}
                        />
                        <StatLine
                          label={t("common:report_farmer_rice_qty")}
                          value={formatReportWeightMetric("totalRiceQuantity", s.paddy_warehouse.farmerOwned.totalRiceQuantity, t, locale)}
                        />
                      </div>
                      <ReportDetailEntriesTable t={t} tableId="paddy_farmer" tablesById={tablesById} />
                    </div>
                  ) : null}
                </div>
              </ReportSectionCard>
            ) : null}

            {s.paddy_process ? (
              <ReportSectionCard
                borderClass="border-s-4 border-s-orange-500"
                iconWrapClass="bg-orange-500/10 text-orange-800 dark:text-orange-400"
                icon={<Factory className="h-5 w-5" strokeWidth={1.75} />}
                title={t("sidebar:paddy_process:paddy_process")}
                description={t("common:report_in_period")}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricTile label={t("common:entries")} value={formatDisplayNumber(s.paddy_process.recordCount, locale)} />
                  <MetricTile label={t("common:report_weight")} value={formatReportWeightMetric("totalWeight", s.paddy_process.totalWeight, t, locale)} />
                  <MetricTile
                    label={t("common:totalWeightKg")}
                    value={formatReportWeightMetric("totalProcessedWeightKg", s.paddy_process.totalProcessedWeightKg, t, locale)}
                  />
                </div>
                <ReportDetailEntriesTable t={t} tableId="paddy_process" tablesById={tablesById} />
              </ReportSectionCard>
            ) : null}

            {s.rice_warehouse ? (
              <ReportSectionCard
                borderClass="border-s-4 border-s-sky-500"
                iconWrapClass="bg-sky-500/10 text-sky-800 dark:text-sky-400"
                icon={<Package2 className="h-5 w-5" strokeWidth={1.75} />}
                title={t("sidebar:rice_warehouse:rice")}
                description={t("common:report_in_period")}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricTile label={t("common:entries")} value={formatDisplayNumber(s.rice_warehouse.recordCount, locale)} />
                  <MetricTile label={t("common:quantity")} value={formatReportWeightMetric("totalQuantity", s.rice_warehouse.totalQuantity, t, locale)} />
                  <MetricTile
                    label={t("common:amount")}
                    value={formatNumber(s.rice_warehouse.totalAmount, locale, { minimumFractionDigits: 2 })}
                  />
                </div>
                <ReportDetailEntriesTable t={t} tableId="rice_warehouse" tablesById={tablesById} />
              </ReportSectionCard>
            ) : null}

            {s.process_rice ? (
              <ReportSectionCard
                borderClass="border-s-4 border-s-cyan-600"
                iconWrapClass="bg-cyan-500/10 text-cyan-800 dark:text-cyan-400"
                icon={<Wheat className="h-5 w-5" strokeWidth={1.75} />}
                title={t("sidebar:rice_warehouse:process_rice")}
                description={t("common:report_in_period")}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricTile label={t("common:entries")} value={formatDisplayNumber(s.process_rice.recordCount, locale)} />
                  <MetricTile label={t("common:report_weight")} value={formatReportWeightMetric("totalWeight", s.process_rice.totalWeight, t, locale)} />
                  <MetricTile
                    label={t("common:totalWeightKg")}
                    value={formatReportWeightMetric("totalProcessedWeightKg", s.process_rice.totalProcessedWeightKg, t, locale)}
                  />
                </div>
                <ReportDetailEntriesTable t={t} tableId="process_rice" tablesById={tablesById} />
              </ReportSectionCard>
            ) : null}

            {s.rice_sales ? (
              <ReportSectionCard
                borderClass="border-s-4 border-s-teal-600"
                iconWrapClass="bg-teal-500/10 text-teal-800 dark:text-teal-400"
                icon={<ShoppingCart className="h-5 w-5" strokeWidth={1.75} />}
                title={t("sidebar:rice_warehouse:rice_sales")}
                description={t("common:report_in_period")}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricTile label={t("common:entries")} value={formatDisplayNumber(s.rice_sales.recordCount, locale)} />
                  <MetricTile label={t("common:quantity")} value={formatReportWeightMetric("totalQuantity", s.rice_sales.totalQuantity, t, locale)} />
                </div>
                <ReportDetailEntriesTable t={t} tableId="rice_sales" tablesById={tablesById} />
              </ReportSectionCard>
            ) : null}

            {s.rice_charities ? (
              <ReportSectionCard
                borderClass="border-s-4 border-s-rose-600"
                iconWrapClass="bg-rose-500/10 text-rose-800 dark:text-rose-400"
                icon={<ShoppingCart className="h-5 w-5" strokeWidth={1.75} />}
                title={t("sidebar:rice_warehouse:rice_charity")}
                description={t("common:report_in_period")}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricTile label={t("common:entries")} value={formatDisplayNumber(s.rice_charities.recordCount, locale)} />
                  <MetricTile label={t("common:quantity")} value={formatReportWeightMetric("totalQuantity", s.rice_charities.totalQuantity, t, locale)} />
                </div>
                <ReportDetailEntriesTable t={t} tableId="rice_charities" tablesById={tablesById} />
              </ReportSectionCard>
            ) : null}

            {s.store ? (
              <ReportSectionCard
                borderClass="border-s-4 border-s-slate-600 md:col-span-2"
                iconWrapClass="bg-slate-500/10 text-slate-800 dark:text-slate-300"
                icon={<PackageOpen className="h-5 w-5" strokeWidth={1.75} />}
                title={t("sidebar:store:store")}
                description={t("common:report_in_period")}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricTile label={t("common:entries")} value={formatDisplayNumber(s.store.entryCount, locale)} />
                  <MetricTile label={t("common:store_sale_count")} value={formatDisplayNumber(s.store.saleCount, locale)} />
                  <MetricTile
                    label={t("common:available_store_stock")}
                    value={formatReportWeightMetric("totalProcessedWeightKg", s.store.stock?.totalAvailableKg, t, locale)}
                  />
                </div>

                <p className="mb-2 mt-4 text-sm font-medium text-foreground/80">{t("common:store_stock_by_type")}</p>
                <ReportDataTable
                  colSpan={4}
                  empty={!s.store.stock?.byStoreType.length}
                  emptyLabel={t("common:no_data")}
                  head={
                    <>
                      <th className="px-3 py-3 font-semibold text-foreground/80">{t("common:type")}</th>
                      <th className="px-3 py-3 text-end font-semibold text-foreground/80">{t("common:store_stock_total")}</th>
                      <th className="px-3 py-3 text-end font-semibold text-foreground/80">{t("common:store_stock_sold")}</th>
                      <th className="px-3 py-3 text-end font-semibold text-foreground/80">{t("common:store_stock_remaining")}</th>
                    </>
                  }
                  rows={(s.store.stock?.byStoreType ?? []).map((row) => (
                    <tr key={row.storeType} className="transition-colors hover:bg-muted/40">
                      <td className="px-3 py-2.5 font-medium">{t(STORE_TYPE_TO_SIDEBAR[row.storeType] ?? row.storeType)}</td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        {formatReportWeightMetric("totalProcessedWeightKg", row.totalWeightKg, t, locale)}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        {formatReportWeightMetric("totalProcessedWeightKg", row.soldWeightKg, t, locale)}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        {formatReportWeightMetric("totalProcessedWeightKg", row.availableWeightKg, t, locale)}
                      </td>
                    </tr>
                  ))}
                />

                <p className="mb-2 mt-4 text-sm font-medium text-foreground/80">{t("common:report_in_period")}</p>
                <ReportDataTable
                  colSpan={4}
                  empty={STORE_TYPE_ORDER.every((key) => (s.store.byStoreType[key]?.recordCount ?? 0) === 0)}
                  emptyLabel={t("common:no_data")}
                  head={
                    <>
                      <th className="px-3 py-3 font-semibold text-foreground/80">{t("common:type")}</th>
                      <th className="px-3 py-3 text-end font-semibold text-foreground/80">{t("common:entries")}</th>
                      <th className="px-3 py-3 text-end font-semibold text-foreground/80">{t("common:report_weight")}</th>
                      <th className="px-3 py-3 text-end font-semibold text-foreground/80">{t("common:totalWeightKg")}</th>
                    </>
                  }
                  rows={STORE_TYPE_ORDER.map((key) => {
                    const v = s.store.byStoreType[key] ?? {
                      recordCount: 0,
                      totalWeight: "0",
                      totalProcessedWeightKg: "0",
                    };
                    return (
                      <tr key={key} className="transition-colors hover:bg-muted/40">
                        <td className="px-3 py-2.5 font-medium">{t(STORE_TYPE_TO_SIDEBAR[key] ?? key)}</td>
                        <td className="px-3 py-2.5 text-end tabular-nums">{formatDisplayNumber(v.recordCount, locale)}</td>
                        <td className="px-3 py-2.5 text-end tabular-nums">{formatReportWeightMetric("totalWeight", v.totalWeight, t, locale)}</td>
                        <td className="px-3 py-2.5 text-end tabular-nums">{formatReportWeightMetric("totalProcessedWeightKg", v.totalProcessedWeightKg, t, locale)}</td>
                      </tr>
                    );
                  })}
                />

                <p className="mb-2 mt-4 text-sm font-medium text-foreground/80">{t("common:store_sale_count")}</p>
                <ReportDataTable
                  colSpan={4}
                  empty={STORE_TYPE_ORDER.every((key) => (s.store.salesByStoreType[key]?.saleCount ?? 0) === 0)}
                  emptyLabel={t("common:no_data")}
                  head={
                    <>
                      <th className="px-3 py-3 font-semibold text-foreground/80">{t("common:type")}</th>
                      <th className="px-3 py-3 text-end font-semibold text-foreground/80">{t("common:store_sale_count")}</th>
                      <th className="px-3 py-3 text-end font-semibold text-foreground/80">{t("common:report_weight")}</th>
                      <th className="px-3 py-3 text-end font-semibold text-foreground/80">{t("common:amount")}</th>
                    </>
                  }
                  rows={STORE_TYPE_ORDER.map((key) => {
                    const v = s.store.salesByStoreType[key] ?? {
                      saleCount: 0,
                      totalSoldWeight: "0",
                      totalSoldWeightKg: "0",
                      totalSaleAmount: "0",
                    };
                    return (
                      <tr key={key} className="transition-colors hover:bg-muted/40">
                        <td className="px-3 py-2.5 font-medium">{t(STORE_TYPE_TO_SIDEBAR[key] ?? key)}</td>
                        <td className="px-3 py-2.5 text-end tabular-nums">{formatDisplayNumber(v.saleCount, locale)}</td>
                        <td className="px-3 py-2.5 text-end tabular-nums">{formatReportWeightMetric("totalSoldWeight", v.totalSoldWeight, t, locale)}</td>
                        <td className="px-3 py-2.5 text-end tabular-nums">{formatNumber(v.totalSaleAmount, locale, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                />

                <ReportDetailEntriesTable t={t} tableId="store" tablesById={tablesById} />
                <ReportDetailEntriesTable t={t} tableId="store_sales" tablesById={tablesById} />
              </ReportSectionCard>
            ) : null}

            {s.expenses ? (
              <ReportSectionCard
                borderClass="border-s-4 border-s-rose-500 md:col-span-2"
                iconWrapClass="bg-rose-500/10 text-rose-800 dark:text-rose-400"
                icon={<Receipt className="h-5 w-5" strokeWidth={1.75} />}
                title={t("sidebar:expenses:expenses")}
                description={t("common:report_in_period")}
              >
                <ReportDataTable
                  colSpan={3}
                  empty={s.expenses.byCurrency.length === 0}
                  emptyLabel={t("common:no_data")}
                  head={
                    <>
                      <th className="px-3 py-3 font-semibold text-foreground/80">{t("common:currency")}</th>
                      <th className="px-3 py-3 text-end font-semibold text-foreground/80">{t("common:entries")}</th>
                      <th className="px-3 py-3 text-end font-semibold text-foreground/80">{t("common:amount")}</th>
                    </>
                  }
                  rows={s.expenses.byCurrency.map((c) => (
                    <tr key={c.currencyCode} className="transition-colors hover:bg-muted/40">
                      <td className="px-3 py-2.5 font-medium">
                        {formatCurrencyTitle(c.currencyCode, c.currencyName, t)}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">{formatDisplayNumber(c.entryCount, locale)}</td>
                      <td className="px-3 py-2.5 text-end font-medium tabular-nums">
                        {formatNumber(c.totalAmount, locale, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                />
                <ReportDetailEntriesTable t={t} tableId="expenses" tablesById={tablesById} />
              </ReportSectionCard>
            ) : null}

            {s.jwali ? (
              <ReportSectionCard
                borderClass="border-s-4 border-s-indigo-600"
                iconWrapClass="bg-indigo-500/10 text-indigo-800 dark:text-indigo-400"
                icon={<Users className="h-5 w-5" strokeWidth={1.75} />}
                title={t("sidebar:jwali:jwali")}
                description={t("common:report_in_period")}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricTile label={t("common:entries")} value={formatDisplayNumber(s.jwali.entryCount, locale)} />
                  <MetricTile
                    label={t("common:amount")}
                    value={formatNumber(s.jwali.totalAmount, locale, { minimumFractionDigits: 2 })}
                  />
                </div>
                <ReportDetailEntriesTable t={t} tableId="jwali" tablesById={tablesById} />
              </ReportSectionCard>
            ) : null}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
