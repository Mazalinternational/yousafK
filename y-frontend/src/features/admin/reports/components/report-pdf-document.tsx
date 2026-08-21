import { Document, Page, StyleSheet, View, pdf } from "@react-pdf/renderer";
import type { TFunction } from "i18next";
import { getTranslationLanguage } from "@/i18n";
import {
  PdfText,
  getLocalizedPdfOptionsFromLanguage,
  getPdfPageStyle,
  renderLocalizedPdf,
} from "@/utils/pdfFonts";

const baseStyles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 8,
    color: "#6b7280",
    marginBottom: 10,
  },
  limitNote: {
    fontSize: 7,
    color: "#92400e",
    marginBottom: 10,
    padding: 6,
    backgroundColor: "#fffbeb",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  metaBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    backgroundColor: "#f9fafb",
  },
  metaLine: {
    marginBottom: 3,
    lineHeight: 1.35,
  },
  metaLabel: {
    fontSize: 7,
    color: "#6b7280",
    marginBottom: 1,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: 600,
  },
  section: {
    marginBottom: 12,
  },
  blockTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
    color: "#1f2937",
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  summaryLabel: {
    fontSize: 8,
    color: "#4b5563",
    maxWidth: "55%",
  },
  summaryValue: {
    fontSize: 8,
    fontWeight: 600,
    maxWidth: "42%",
    textAlign: "right",
  },
  trHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    backgroundColor: "#f3f4f6",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  th: {
    flex: 1,
    fontSize: 6.5,
    fontWeight: 700,
    color: "#374151",
    paddingHorizontal: 2,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  td: {
    flex: 1,
    fontSize: 6.5,
    color: "#111827",
    paddingHorizontal: 2,
  },
  emptyCell: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 4,
  },
});

export type ReportPdfLine = { label: string; value: string };

export type ReportPdfTableSection = {
  heading: string;
  summaryLines: ReportPdfLine[];
  columns: string[];
  rows: string[][];
};

export type ReportPdfPayload = {
  docTitle: string;
  subtitle: string;
  meta: ReportPdfLine[];
  tables: ReportPdfTableSection[];
  entryLimitNote: string | null;
};

type ReportPdfDocumentProps = ReportPdfPayload & {
  documentRtl: boolean;
  useArabicFont: boolean;
};

function ReportPdfDocument({
  docTitle,
  subtitle,
  meta,
  tables,
  entryLimitNote,
  documentRtl,
  useArabicFont,
}: ReportPdfDocumentProps) {
  const pageStyle = getPdfPageStyle({
    baseStyle: baseStyles.page,
    documentRtl,
    useArabicFont,
  });
  const textOpts = { documentRtl, useArabicFont };

  return (
    <Document title={docTitle} author="YKMIS" subject={docTitle}>
      <Page size="A4" style={pageStyle}>
        <PdfText style={baseStyles.title} {...textOpts}>
          {docTitle}
        </PdfText>
        <PdfText style={baseStyles.subtitle} {...textOpts}>
          {subtitle}
        </PdfText>

        {entryLimitNote ? (
          <PdfText style={baseStyles.limitNote} {...textOpts}>
            {entryLimitNote}
          </PdfText>
        ) : null}

        <View style={baseStyles.metaBox}>
          {meta.map((m, i) => (
            <View key={`meta-${i}`} style={baseStyles.metaLine} wrap={false}>
              <PdfText style={baseStyles.metaLabel} {...textOpts}>
                {m.label}
              </PdfText>
              <PdfText style={baseStyles.metaValue} {...textOpts}>
                {m.value}
              </PdfText>
            </View>
          ))}
        </View>

        {tables.map((tbl, ti) => (
          <View key={`tbl-${ti}-${tbl.heading}`} style={baseStyles.section} wrap>
            <PdfText style={baseStyles.blockTitle} {...textOpts}>
              {tbl.heading}
            </PdfText>
            {tbl.summaryLines.map((line, li) => (
              <View key={`sum-${ti}-${li}`} style={baseStyles.summaryLine} wrap={false}>
                <PdfText style={baseStyles.summaryLabel} {...textOpts}>
                  {line.label}
                </PdfText>
                <PdfText style={baseStyles.summaryValue} {...textOpts}>
                  {line.value}
                </PdfText>
              </View>
            ))}
            <View style={baseStyles.trHead} wrap={false}>
              {tbl.columns.map((col, ci) => (
                <PdfText key={`h-${ti}-${ci}`} style={baseStyles.th} {...textOpts}>
                  {col}
                </PdfText>
              ))}
            </View>
            {tbl.rows.length === 0 ? (
              <PdfText style={baseStyles.emptyCell} {...textOpts}>
                —
              </PdfText>
            ) : (
              tbl.rows.map((row, ri) => (
                <View key={`r-${ti}-${ri}`} style={baseStyles.tr} wrap={false}>
                  {row.map((cell, ci) => (
                    <PdfText key={`c-${ti}-${ri}-${ci}`} style={baseStyles.td} {...textOpts}>
                      {cell}
                    </PdfText>
                  ))}
                </View>
              ))
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}

function collectReportPdfTexts(payload: ReportPdfPayload) {
  return [
    payload.docTitle,
    payload.subtitle,
    payload.entryLimitNote,
    ...payload.meta.flatMap((line) => [line.label, line.value]),
    ...payload.tables.flatMap((table) => [
      table.heading,
      ...table.summaryLines.flatMap((line) => [line.label, line.value]),
      ...table.columns,
      ...table.rows.flat(),
    ]),
  ];
}

export async function buildReportPdfBlob(
  payload: ReportPdfPayload,
  t?: TFunction,
): Promise<Blob> {
  const language = t ? getTranslationLanguage(t) : "en";
  const { documentRtl, useArabicFont, needsArabicFonts } = getLocalizedPdfOptionsFromLanguage(
    language,
    ...collectReportPdfTexts(payload),
  );

  return renderLocalizedPdf(
    () =>
      pdf(
        <ReportPdfDocument
          {...payload}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        />,
      ).toBlob(),
    { needsArabicFonts, language },
  );
}

export function openReportPdfPrintPreview(blob: Blob) {
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, "_blank", "noopener,noreferrer");

  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    throw new Error("Unable to open PDF preview");
  }

  printWindow.addEventListener("load", () => {
    printWindow.focus();
    printWindow.print();
  });

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60_000);
}
