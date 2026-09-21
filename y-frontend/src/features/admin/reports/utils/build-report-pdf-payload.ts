import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { getLocalizedCurrencyName } from "@/utils/currencyDisplay";
import { getTranslationLanguage } from "@/i18n";
import {
  formatDisplayAmount,
  formatDisplayNumber,
  getDisplayLocale,
} from "@/utils/displayLocale";
import {
  formatKilogramsAsSeer,
  formatReportWeightValue,
  formatSeerQuantity,
  isKilogramReportFieldKey,
  isSeerReportFieldKey,
} from "@/utils/weightUnit";
import type { ReportPdfLine, ReportPdfPayload, ReportPdfTableSection } from "../components/report-pdf-document";
import type { ReportSummary } from "../schemas/reports";

function fmt(
  value: string | number | null | undefined,
  _locale: string,
  options?: Intl.NumberFormatOptions,
) {
  if (value === null || value === undefined || value === "") return "—";
  // Always Western "." decimals — fa-AF/ps-AF Arabic decimal ٫ looks missing.
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    ...options,
  }).format(Number(value));
}

function fmtSeer(value: string | number | null | undefined, tr: TFunction, locale: string): string {
  if (value === null || value === undefined || value === "") return "—";
  return formatSeerQuantity(value, tr, locale);
}

function fmtKg(value: string | number | null | undefined, tr: TFunction, locale: string): string {
  if (value === null || value === undefined || value === "") return "—";
  return formatKilogramsAsSeer(value, tr, locale);
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object" && v !== null && "toString" in v) return String(v);
  return String(v);
}

function isNumericCellValue(v: unknown): v is number | string {
  if (typeof v === "number" && Number.isFinite(v)) return true;
  if (typeof v === "string" && v.trim() !== "") {
    return /^-?\d+\.?\d*$/.test(v.trim()) && !Number.isNaN(Number(v));
  }
  return false;
}

/** Formats one raw entry field for PDF tables and on-screen detail tables. */
export function formatReportCellForDisplay(
  key: string,
  v: unknown,
  t: TFunction,
  row?: Record<string, unknown>,
): string {
  const locale = getDisplayLocale(getTranslationLanguage(t));
  if (v === null || v === undefined) return "—";
  if (key === "currencyName" && typeof v === "string") {
    const code = row?.currencyCode;
    if (typeof code === "string") return getLocalizedCurrencyName(code, v, t);
  }
  if (key === "date" || key === "receivedDate" || key === "saleDate" || key === "occurredAt") return cellDate(v);
  if (key === "paidInCash" && typeof v === "boolean") return v ? t("common:yes") : t("common:no");
  if (key === "paymentChannel") {
    if (v === "saraf") return t("common:pay_to_saraf");
    if (v === "cash") return t("common:pay_in_cash");
  }
  if (key === "direction") {
    if (v === "in") return t("common:report_cash_in");
    if (v === "out") return t("common:report_cash_out");
  }
  if (key === "entrySource" && typeof v === "string") {
    return t(`common:report_sarafi_source_${v}`, { defaultValue: v });
  }
  if (typeof v === "number" && (key.includes("Amount") || key === "amount" || key === "rate" || key === "ratePerBag"))
    return formatDisplayAmount(v, locale);
  if (typeof v === "string" && /^\d+\.?\d*$/.test(v) && (key === "amount" || key.includes("Amount")))
    return formatDisplayAmount(v, locale);
  if (typeof v === "number" && key === "bagCount") return formatDisplayNumber(v, locale);
  if (typeof v === "string" && /^\d+$/.test(v) && key === "bagCount") return formatDisplayNumber(v, locale);
  if (isNumericCellValue(v) && (isKilogramReportFieldKey(key) || isSeerReportFieldKey(key))) {
    const unit = typeof row?.unit === "string" ? row.unit : undefined;
    return formatReportWeightValue(key, Number(v), t, unit, locale);
  }
  return cell(v);
}

function formatCurrencyLabel(code: string, name: string, t: TFunction) {
  const localizedName = getLocalizedCurrencyName(code, name, t);
  return `${code} (${localizedName})`;
}

function cellDate(iso: unknown): string {
  if (iso === null || iso === undefined) return "—";
  if (typeof iso !== "string") return cell(iso);
  try {
    return dateFormatter(iso);
  } catch {
    return iso;
  }
}

const STORE_TYPE_TO_SIDEBAR: Record<string, string> = {
  short_green: "sidebar:store:short_green",
  regection: "sidebar:store:regection",
  broken_rice: "sidebar:store:broken_rice",
  waste: "sidebar:store:waste",
};

const STORE_TYPE_ORDER = ["short_green", "regection", "broken_rice", "waste"] as const;

export type ReportUiTable = {
  id: string;
  heading: string;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
};

export type ReportBuilt = {
  pdf: ReportPdfPayload;
  uiTables: ReportUiTable[];
};

function pick(row: Record<string, unknown>, keys: string[], t: TFunction): string[] {
  return keys.map((k) => formatReportCellForDisplay(k, row[k], t, row));
}

export function buildFullReportOutput(
  data: ReportSummary,
  t: TFunction,
  opts: { rangeLabel: string; presetLabel: string; anchorDate: string },
): ReportBuilt {
  const { rangeLabel, presetLabel, anchorDate } = opts;
  const locale = getDisplayLocale(getTranslationLanguage(t));
  const s = data.sections;
  const limit = data.entryLimit ?? 5000;
  const entryLimitNote =
    limit > 0 ? t("common:report_entry_limit_note", { limit: formatDisplayNumber(limit, locale) }) : null;

  const meta: ReportPdfLine[] = [
    { label: t("common:report_period"), value: presetLabel },
    { label: t("common:report_reference_date"), value: anchorDate },
    { label: t("common:report_pdf_range_label"), value: rangeLabel },
    {
      label: t("common:report_pdf_season"),
      value: data.season?.name ?? "—",
    },
    {
      label: t("common:report_pdf_generated"),
      value: dateFormatter(new Date().toISOString()),
    },
  ];

  const tables: ReportPdfTableSection[] = [];
  const uiTables: ReportUiTable[] = [];

  const addTable = (
    id: string,
    heading: string,
    summaryLines: ReportPdfLine[],
    keys: string[],
    labels: string[],
    rows: Record<string, unknown>[],
  ) => {
    const pdfRows = rows.map((r) => pick(r, keys, t));
    tables.push({ heading, summaryLines, columns: labels, rows: pdfRows });
    uiTables.push({
      id,
      heading,
      columns: keys.map((key, i) => ({ key, label: labels[i] ?? key })),
      rows,
    });
  };

  if (s.entering_paddy) {
    const keys = [
      "billNo",
      "date",
      "paddyOwner",
      "variety",
      "totalWeightKg",
      "receivedFrom",
      "phoneNo",
      "driverName",
      "carPlate",
    ];
    const labels = keys.map((k) => reportFieldLabel(k, t));
    addTable(
      "entering_paddy",
      t("sidebar:entering_paddy:entering_paddy"),
      [
        { label: t("common:entries"), value: formatDisplayNumber(s.entering_paddy.recordCount, locale) },
        { label: t("common:totalWeightKg"), value: fmtKg(s.entering_paddy.totalWeightKg, t, locale) },
      ],
      keys,
      labels,
      s.entering_paddy.entries ?? [],
    );
  }

  if (s.paddy_warehouse?.companyOwned) {
    const keys = [
      "billNo",
      "enteringBillNo",
      "receivedDate",
      "ownerName",
      "variety",
      "quantity",
      "unit",
      "totalAmount",
      "paidAmount",
      "remainingAmount",
      "paymentType",
      "paymentChannel",
      "sarafName",
      "sarafCurrencyCode",
      "notes",
    ];
    const labels = keys.map((k) => reportFieldLabel(k, t));
    addTable(
      "paddy_company",
      `${t("sidebar:paddy_warehouse:paddy_warehouse")} — ${t("sidebar:paddy_warehouse:company_owned")}`,
      [
        { label: t("common:entries"), value: formatDisplayNumber(s.paddy_warehouse.companyOwned.recordCount, locale) },
        { label: t("common:quantity"), value: fmtSeer(s.paddy_warehouse.companyOwned.totalQuantity, t, locale) },
        { label: t("common:amount"), value: fmt(s.paddy_warehouse.companyOwned.totalAmount, locale, { minimumFractionDigits: 2 }) },
      ],
      keys,
      labels,
      s.paddy_warehouse.companyOwned.entries ?? [],
    );
  }

  if (s.paddy_warehouse?.farmerOwned) {
    const keys = [
      "billNo",
      "enteringBillNo",
      "receivedDate",
      "ownerName",
      "paddyVariety",
      "paddyQuantity",
      "riceVariety",
      "riceQuantity",
      "unit",
      "notes",
    ];
    const labels = keys.map((k) => reportFieldLabel(k, t));
    addTable(
      "paddy_farmer",
      `${t("sidebar:paddy_warehouse:paddy_warehouse")} — ${t("sidebar:paddy_warehouse:farmer_owned")}`,
      [
        { label: t("common:entries"), value: formatDisplayNumber(s.paddy_warehouse.farmerOwned.recordCount, locale) },
        { label: t("common:totalStockKg"), value: fmtSeer(s.paddy_warehouse.farmerOwned.totalPaddyQuantity, t, locale) },
        { label: t("common:report_farmer_rice_qty"), value: fmtSeer(s.paddy_warehouse.farmerOwned.totalRiceQuantity, t, locale) },
      ],
      keys,
      labels,
      s.paddy_warehouse.farmerOwned.entries ?? [],
    );
  }

  if (s.paddy_process) {
    const keys = ["billNo", "date", "variety", "weight", "unit", "processedWeightKg", "status"];
    const labels = keys.map((k) => reportFieldLabel(k, t));
    addTable(
      "paddy_process",
      t("sidebar:paddy_process:paddy_process"),
      [
        { label: t("common:entries"), value: formatDisplayNumber(s.paddy_process.recordCount, locale) },
        { label: t("common:report_weight"), value: fmtSeer(s.paddy_process.totalWeight, t, locale) },
        { label: t("common:totalWeightKg"), value: fmtKg(s.paddy_process.totalProcessedWeightKg, t, locale) },
      ],
      keys,
      labels,
      s.paddy_process.entries ?? [],
    );
  }

  if (s.rice_warehouse) {
    const keys = [
      "receivedDate",
      "ownerName",
      "variety",
      "quantity",
      "unit",
      "totalAmount",
      "paidAmount",
      "remainingAmount",
      "paymentType",
      "stockType",
      "notes",
    ];
    const labels = keys.map((k) => reportFieldLabel(k, t));
    addTable(
      "rice_warehouse",
      t("sidebar:rice_warehouse:rice"),
      [
        { label: t("common:entries"), value: formatDisplayNumber(s.rice_warehouse.recordCount, locale) },
        { label: t("common:quantity"), value: fmtSeer(s.rice_warehouse.totalQuantity, t, locale) },
        { label: t("common:amount"), value: fmt(s.rice_warehouse.totalAmount, locale, { minimumFractionDigits: 2 }) },
      ],
      keys,
      labels,
      s.rice_warehouse.entries ?? [],
    );
  }

  if (s.process_rice) {
    const keys = ["billNo", "processedBillNo", "date", "variety", "weight", "unit", "processedWeightKg"];
    const labels = keys.map((k) => reportFieldLabel(k, t));
    addTable(
      "process_rice",
      t("sidebar:rice_warehouse:process_rice"),
      [
        { label: t("common:entries"), value: formatDisplayNumber(s.process_rice.recordCount, locale) },
        { label: t("common:report_weight"), value: fmtSeer(s.process_rice.totalWeight, t, locale) },
        { label: t("common:totalWeightKg"), value: fmtKg(s.process_rice.totalProcessedWeightKg, t, locale) },
      ],
      keys,
      labels,
      s.process_rice.entries ?? [],
    );
  }

  if (s.rice_sales) {
    const keys = [
      "billNo",
      "saleDate",
      "riceVariety",
      "quantity",
      "unit",
      "totalAmount",
      "paymentType",
      "paidAmount",
      "remainingAmount",
      "paidInCash",
      "paymentChannel",
      "sarafName",
      "sarafCurrencyCode",
      "buyerName",
      "notes",
    ];
    const labels = keys.map((k) => reportFieldLabel(k, t));
    addTable(
      "rice_sales",
      t("sidebar:rice_warehouse:rice_sales"),
      [
        { label: t("common:entries"), value: formatDisplayNumber(s.rice_sales.recordCount, locale) },
        { label: t("common:quantity"), value: fmtSeer(s.rice_sales.totalQuantity, t, locale) },
      ],
      keys,
      labels,
      s.rice_sales.entries ?? [],
    );
  }

  if (s.rice_charities) {
    const keys = [
      "billNo",
      "charityDate",
      "riceVariety",
      "quantity",
      "unit",
      "recipientName",
      "notes",
    ];
    const labels = keys.map((k) => reportFieldLabel(k, t));
    addTable(
      "rice_charities",
      t("sidebar:rice_warehouse:rice_charity"),
      [
        { label: t("common:entries"), value: formatDisplayNumber(s.rice_charities.recordCount, locale) },
        { label: t("common:quantity"), value: fmtSeer(s.rice_charities.totalQuantity, t, locale) },
      ],
      keys,
      labels,
      s.rice_charities.entries ?? [],
    );
  }

  if (s.store) {
    const entryKeys = [
      "storeType",
      "billNo",
      "processedBillNo",
      "date",
      "variety",
      "weight",
      "unit",
      "processedWeightKg",
      "ownerName",
    ];
    const entryLabels = entryKeys.map((k) => reportFieldLabel(k, t));
    const entryRows = (s.store.entries ?? []).map((r) => {
      const st = typeof r.storeType === "string" ? r.storeType : "";
      return {
        ...r,
        storeType: st ? t(STORE_TYPE_TO_SIDEBAR[st] ?? st) : "—",
      };
    });
    const periodEntrySummary: ReportPdfLine[] = STORE_TYPE_ORDER.map((key) => {
      const v = s.store!.byStoreType[key] ?? {
        recordCount: 0,
        totalWeight: "0",
        totalProcessedWeightKg: "0",
      };
      return {
        label: t(STORE_TYPE_TO_SIDEBAR[key] ?? key),
        value: `${t("common:entries")}: ${formatDisplayNumber(v.recordCount, locale)} · ${t("common:report_weight")}: ${fmtSeer(v.totalWeight, t, locale)} · ${t("common:totalWeightKg")}: ${fmtKg(v.totalProcessedWeightKg, t, locale)}`,
      };
    });
    addTable(
      "store",
      t("sidebar:store:store"),
      [
        { label: t("common:entries"), value: formatDisplayNumber(s.store.entryCount, locale) },
        ...periodEntrySummary,
      ],
      entryKeys,
      entryLabels,
      entryRows,
    );

    const stockRows = (s.store.stock?.byStoreType ?? []).map((row) => ({
      storeType: t(STORE_TYPE_TO_SIDEBAR[row.storeType] ?? row.storeType),
      totalWeightKg: row.totalWeightKg,
      soldWeightKg: row.soldWeightKg,
      availableWeightKg: row.availableWeightKg,
    }));
    const stockKeys = ["storeType", "totalWeightKg", "soldWeightKg", "availableWeightKg"];
    const stockLabels = [
      t("common:type"),
      t("common:store_stock_total"),
      t("common:store_stock_sold"),
      t("common:store_stock_remaining"),
    ];
    uiTables.push({
      id: "store_stock",
      heading: t("common:store_stock_by_type"),
      columns: stockKeys.map((key, index) => ({ key, label: stockLabels[index] ?? key })),
      rows: stockRows,
    });
    tables.push({
      heading: t("common:store_stock_by_type"),
      summaryLines: [
        {
          label: t("common:available_store_stock"),
          value: fmtKg(s.store.stock?.totalAvailableKg, t, locale),
        },
      ],
      columns: stockLabels,
      rows: stockRows.map((row) =>
        stockKeys.map((k) => formatReportCellForDisplay(k, row[k as keyof typeof row], t, row)),
      ),
    });

    const saleKeys = [
      "storeType",
      "billNo",
      "saleDate",
      "variety",
      "soldWeight",
      "unit",
      "soldWeightKg",
      "saleAmount",
      "paymentType",
      "paidAmount",
      "remainingAmount",
      "paidInCash",
      "paymentChannel",
      "sarafName",
      "sarafCurrencyCode",
      "buyerName",
      "notes",
    ];
    const saleLabels = saleKeys.map((k) => reportFieldLabel(k, t));
    const saleRows = (s.store.sales ?? []).map((r) => {
      const st = typeof r.storeType === "string" ? r.storeType : "";
      return {
        ...r,
        storeType: st ? t(STORE_TYPE_TO_SIDEBAR[st] ?? st) : "—",
      };
    });
    const salesSummary: ReportPdfLine[] = [
      { label: t("common:store_sale_count"), value: formatDisplayNumber(s.store.saleCount, locale) },
      {
        label: t("common:totalWeightKg"),
        value: fmtKg(s.store.totalSoldWeightKg, t, locale),
      },
      {
        label: t("common:amount"),
        value: fmt(s.store.totalSaleAmount, locale, { minimumFractionDigits: 2 }),
      },
      ...STORE_TYPE_ORDER.map((key) => {
        const v = s.store!.salesByStoreType[key] ?? {
          saleCount: 0,
          totalSoldWeight: "0",
          totalSoldWeightKg: "0",
          totalSaleAmount: "0",
        };
        return {
          label: t(STORE_TYPE_TO_SIDEBAR[key] ?? key),
          value: `${t("common:store_sale_count")}: ${formatDisplayNumber(v.saleCount, locale)} · ${t("common:report_weight")}: ${fmtSeer(v.totalSoldWeight, t, locale)} · ${t("common:amount")}: ${fmt(v.totalSaleAmount, locale, { minimumFractionDigits: 2 })}`,
        };
      }),
    ];
    addTable("store_sales", t("common:store_sale_count"), salesSummary, saleKeys, saleLabels, saleRows);
  }

  if (s.expenses) {
    const keys = ["billNo", "date", "categoryName", "title", "amount", "currencyCode", "currencyName", "notes"];
    const labels = keys.map((k) => reportFieldLabel(k, t));
    const summaryLines: ReportPdfLine[] =
      s.expenses.byCurrency.length === 0
        ? [{ label: t("common:no_data"), value: "—" }]
        : s.expenses.byCurrency.map((c) => ({
            label: formatCurrencyLabel(c.currencyCode, c.currencyName, t),
            value: `${t("common:entries")}: ${formatDisplayNumber(c.entryCount, locale)} · ${t("common:amount")}: ${fmt(c.totalAmount, locale, { minimumFractionDigits: 2 })}`,
          }));
    addTable("expenses", t("sidebar:expenses:expenses"), summaryLines, keys, labels, s.expenses.entries ?? []);
  }

  if (s.jwali) {
    const keys = ["jwaliName", "jwaliPhone", "occurredAt", "bagCount", "ratePerBag", "amount", "notes"];
    const labels = keys.map((k) => reportFieldLabel(k, t));
    addTable(
      "jwali",
      t("sidebar:jwali:jwali"),
      [
        { label: t("common:entries"), value: formatDisplayNumber(s.jwali.entryCount, locale) },
        { label: t("common:amount"), value: fmt(s.jwali.totalAmount, locale, { minimumFractionDigits: 2 }) },
      ],
      keys,
      labels,
      s.jwali.entries ?? [],
    );
  }

  if (data.stock) {
    const stockLines: ReportPdfLine[] = [];
    const st = data.stock;
    if (st.entering_paddy) {
      stockLines.push({
        label: t("sidebar:entering_paddy:entering_paddy"),
        value: `${t("common:report_stock_not_in_warehouse")}: ${fmtKg(st.entering_paddy.totalRemainingKg, t, locale)}`,
      });
    }
    if (st.paddy_warehouse) {
      stockLines.push({
        label: t("sidebar:paddy_warehouse:paddy_warehouse"),
        value: fmtKg(st.paddy_warehouse.totalStockKg, t, locale),
      });
    }
    if (st.rice_warehouse) {
      const varietyHint = st.rice_warehouse.varieties?.length
        ? ` (${st.rice_warehouse.varieties
            .map((v) => `${v.variety}: ${fmtKg(v.currentStockKg, t, locale)}`)
            .join(" · ")})`
        : "";
      stockLines.push({
        label: t("sidebar:rice_warehouse:rice"),
        value: `${fmtKg(st.rice_warehouse.currentStockKg, t, locale)}${varietyHint}`,
      });
    }
    if (st.store) {
      stockLines.push({
        label: t("sidebar:store:store"),
        value: fmtKg(st.store.totalAvailableKg, t, locale),
      });
    }
    if (st.cash?.byCurrency.length) {
      stockLines.push({
        label: t("sidebar:cash:cash"),
        value: st.cash.byCurrency
          .map((c) => `${c.currencyCode}: ${fmt(c.balance, locale, { minimumFractionDigits: 2 })}`)
          .join(" · "),
      });
    }
    if (st.sarafi?.byCurrency.length) {
      stockLines.push({
        label: t("sidebar:sarafi:sarafi"),
        value: st.sarafi.byCurrency
          .map((c) => `${c.currencyCode}: ${fmt(c.balance, locale, { minimumFractionDigits: 2 })}`)
          .join(" · "),
      });
    }
    if (stockLines.length > 0) {
      tables.unshift({
        heading: t("common:report_stock_overview_title"),
        summaryLines: stockLines,
        columns: [t("common:report_stock_overview_title"), ""],
        rows: stockLines.map((sl) => [sl.label, sl.value]),
      });
      uiTables.unshift({
        id: "stock_overview",
        heading: t("common:report_stock_overview_title"),
        columns: [{ key: "module", label: t("common:type") }, { key: "value", label: t("common:current_stock_balance") }],
        rows: stockLines.map((sl) => ({ module: sl.label, value: sl.value })),
      });
    }
  }

  if (s.cash) {
    const keys = ["occurredAt", "direction", "amount", "currencyCode", "currencyName", "notes"];
    const labels = keys.map((k) => reportFieldLabel(k, t));
    const periodSummary: ReportPdfLine[] =
      s.cash.byCurrency.length === 0
        ? [{ label: t("common:no_data"), value: "—" }]
        : s.cash.byCurrency.map((c) => ({
            label: formatCurrencyLabel(c.currencyCode, c.currencyName, t),
            value: `${t("common:entries")}: ${formatDisplayNumber(c.entryCount, locale)} · ${t("common:report_cash_in")}: ${fmt(c.cashIn, locale, { minimumFractionDigits: 2 })} · ${t("common:report_cash_out")}: ${fmt(c.cashOut, locale, { minimumFractionDigits: 2 })}`,
          }));
    const balanceLines: ReportPdfLine[] =
      s.cash.stock?.byCurrency.map((c) => ({
        label: `${formatCurrencyLabel(c.currencyCode, c.currencyName, t)} (${t("common:report_cash_balance_now")})`,
        value: fmt(c.balance, locale, { minimumFractionDigits: 2 }),
      })) ?? [];
    addTable(
      "cash",
      t("sidebar:cash:cash"),
      [
        { label: t("common:entries"), value: formatDisplayNumber(s.cash.entryCount, locale) },
        ...balanceLines,
        ...periodSummary,
      ],
      keys,
      labels,
      s.cash.entries ?? [],
    );
  }

  if (s.sarafi) {
    const keys = [
      "sarafName",
      "sarafPhone",
      "occurredAt",
      "amount",
      "currencyCode",
      "currencyName",
      "entrySource",
      "notes",
    ];
    const labels = keys.map((k) => reportFieldLabel(k, t));
    const summaryLines: ReportPdfLine[] =
      s.sarafi.byCurrency.length === 0
        ? [{ label: t("common:no_data"), value: "—" }]
        : s.sarafi.byCurrency.map((c) => ({
            label: formatCurrencyLabel(c.currencyCode, c.currencyName, t),
            value: `${t("common:entries")}: ${formatDisplayNumber(c.entryCount, locale)} · ${t("common:amount")}: ${fmt(c.totalAmount, locale, { minimumFractionDigits: 2 })}`,
          }));
    addTable(
      "sarafi",
      t("sidebar:sarafi:sarafi"),
      summaryLines,
      keys,
      labels,
      s.sarafi.entries ?? [],
    );
  }

  const pdf: ReportPdfPayload = {
    docTitle: t("sidebar:reports:reports"),
    subtitle: t("common:reports_page_description"),
    meta,
    tables,
    entryLimitNote,
  };

  return { pdf, uiTables };
}

export function buildReportPdfPayload(
  data: ReportSummary,
  t: TFunction,
  opts: { rangeLabel: string; presetLabel: string; anchorDate: string },
): ReportPdfPayload {
  return buildFullReportOutput(data, t, opts).pdf;
}

export function buildReportSharePlainText(pdf: ReportPdfPayload): string {
  const lines: string[] = [pdf.docTitle, "", ...pdf.meta.map((m) => `${m.label}: ${m.value}`), ""];
  if (pdf.entryLimitNote) {
    lines.push(pdf.entryLimitNote, "");
  }
  for (const tbl of pdf.tables) {
    lines.push(tbl.heading);
    for (const sl of tbl.summaryLines) {
      lines.push(`  ${sl.label}: ${sl.value}`);
    }
    lines.push(`  [${tbl.columns.join(" | ")}]`);
    for (const row of tbl.rows) {
      lines.push(`  ${row.join(" | ")}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

function reportFieldLabel(field: string, t: TFunction): string {
  const map: Record<string, string> = {
    billNo: "common:bill_no",
    enteringBillNo: "common:report_col_entering_bill",
    date: "common:date",
    receivedDate: "common:report_col_received_date",
    saleDate: "common:date",
    charityDate: "common:date",
    occurredAt: "common:date",
    paddyOwner: "common:paddy_owner",
    variety: "common:variety",
    totalWeightKg: "common:totalWeightKg",
    receivedFrom: "common:received_from",
    phoneNo: "common:phone_number",
    driverName: "common:driver_name",
    carPlate: "common:car_plate",
    ownerName: "common:report_col_owner",
    quantity: "common:quantity",
    unit: "common:unit",
    totalAmount: "common:amount",
    paidAmount: "common:report_col_paid",
    remainingAmount: "common:report_col_remaining",
    paymentType: "common:report_col_payment_type",
    notes: "common:notes",
    paddyVariety: "common:report_col_paddy_variety",
    paddyQuantity: "common:report_col_paddy_qty",
    riceVariety: "common:report_col_rice_variety",
    riceQuantity: "common:report_col_rice_qty",
    weight: "common:report_weight",
    processedWeightKg: "common:totalWeightKg",
    status: "common:status",
    processedBillNo: "common:report_col_process_bill",
    stockType: "common:type",
    buyerName: "common:buyer",
    recipientName: "common:rice_charity_recipient",
    paidInCash: "common:rice_sale_paid_in_cash_column",
    paymentChannel: "common:rice_sale_report_payment_channel",
    sarafName: "common:rice_sale_report_saraf",
    sarafCurrencyCode: "common:rice_sale_report_saraf_currency",
    soldWeight: "common:report_weight",
    soldWeightKg: "common:totalWeightKg",
    saleAmount: "common:amount",
    category: "common:category",
    categoryName: "common:category",
    title: "common:title",
    amount: "common:amount",
    currencyCode: "common:currency",
    currencyName: "common:description",
    jwaliName: "common:report_col_jwali",
    jwaliPhone: "common:phone_number",
    bagCount: "common:report_col_bags",
    ratePerBag: "common:report_col_rate_bag",
    sarafPhone: "common:report_col_saraf_phone",
    entrySource: "common:report_col_entry_source",
    direction: "common:type",
    storeType: "common:type",
    availableWeightKg: "common:store_stock_remaining",
  };
  const k = map[field];
  return k ? t(k) : field;
}
