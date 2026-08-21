import { StyleSheet } from "@react-pdf/renderer";
import type { TFunction } from "i18next";
import { toast } from "sonner";
import { saveBlob } from "@/utils/saveBlob";
import { getDisplayLocale } from "@/utils/displayLocale";
import { getTranslationLanguage } from "@/i18n";
import {
  getPdfPageStyle,
  shouldUseArabicPdfFont,
  shouldUseRtlPdfDocument,
} from "@/utils/pdfFonts";

export const ledgerPdfBaseStyles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 8,
  },
  metaRow: {
    marginBottom: 4,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 8,
    backgroundColor: "#f9fafb",
  },
  summaryLabel: {
    fontSize: 9,
    color: "#4b5563",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 700,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 10,
    color: "#6b7280",
  },
  entryCard: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  entryTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
  },
  entryLine: {
    marginBottom: 3,
    lineHeight: 1.35,
  },
});

export function sanitizeLedgerFileName(name: string, suffix = "ledger") {
  const slug =
    name.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase() ||
    "account";
  return `${slug}-${suffix}.pdf`;
}

export function getLocalizedLedgerPdfOptions(
  t: TFunction,
  ...texts: Array<string | null | undefined>
) {
  const language = getTranslationLanguage(t);
  const locale = getDisplayLocale(language);
  const documentRtl = shouldUseRtlPdfDocument(language);
  const useArabicFont = shouldUseArabicPdfFont(language, ...texts);

  return { locale, documentRtl, useArabicFont };
}

export function getLocalizedLedgerPageStyle(
  t: TFunction,
  ...texts: Array<string | null | undefined>
) {
  const { documentRtl, useArabicFont } = getLocalizedLedgerPdfOptions(t, ...texts);

  return getPdfPageStyle({
    baseStyle: ledgerPdfBaseStyles.page,
    documentRtl,
    useArabicFont,
  });
}

export const openPdfPrintPreview = (blob: Blob, t?: TFunction) => {
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, "_blank", "noopener,noreferrer");

  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    throw new Error(t?.("common:ledger_pdf_preview_error") ?? "Unable to open PDF preview");
  }

  printWindow.addEventListener("load", () => {
    printWindow.focus();
    printWindow.print();
  });

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60_000);
};

export async function shareOrDownloadPdf(
  blob: Blob,
  fileName: string,
  shareTitle: string,
  t: TFunction,
) {
  const pdfFile = new File([blob], fileName, { type: "application/pdf" });

  if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
    await navigator.share({
      title: shareTitle,
      files: [pdfFile],
    });
    return;
  }

  saveBlob(blob, fileName);
  toast.info(t("common:ledger_pdf_share_fallback"));
}

export async function runLedgerPdfAction(
  action: "download" | "share" | "print",
  buildBlob: () => Promise<Blob>,
  fileName: string,
  shareTitle: string,
  t: TFunction,
  onError: (error: unknown) => void,
) {
  try {
    const blob = await buildBlob();

    if (action === "print") {
      openPdfPrintPreview(blob, t);
      return;
    }

    if (action === "download") {
      saveBlob(blob, fileName);
      toast.success(t("common:ledger_pdf_downloaded"));
      return;
    }

    await shareOrDownloadPdf(blob, fileName, shareTitle, t);
  } catch (error) {
    onError(error);
  }
}
