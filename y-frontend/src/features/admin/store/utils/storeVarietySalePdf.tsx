import { Document, Page, View, pdf } from "@react-pdf/renderer";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatDisplayAmount, getDisplayLocale } from "@/utils/displayLocale";
import {
  PdfLabeledValue,
  PdfText,
  getPdfPageStyle,
  shouldUseArabicPdfFont,
  withPdfFonts,
} from "@/utils/pdfFonts";
import { getTranslationLanguage, isRTL } from "@/i18n";
import { ledgerPdfBaseStyles } from "@/utils/ledgerPdf";
import { formatWeightFromKg } from "@/utils/weightUnit";
import type { StoreVarietySale } from "../schemas/store-variety-sale";
import { POOLED_SALE_VARIETY } from "./storePooledTypes";

type StoreVarietySalePdfProps = {
  sale: StoreVarietySale;
  t: TFunction;
  locale: string;
  documentRtl: boolean;
  useArabicFont: boolean;
};

function StoreVarietySalePdfDocument({
  sale,
  t,
  locale,
  documentRtl,
  useArabicFont,
}: StoreVarietySalePdfProps) {
  const pageStyle = getPdfPageStyle({
    baseStyle: ledgerPdfBaseStyles.page,
    documentRtl,
    useArabicFont,
  });
  const buyer = sale.buyerCustomer;
  const paymentLabel =
    sale.paymentChannel === "saraf"
      ? `${t("common:rice_sale_route_saraf")} — ${sale.saraf?.name ?? ""} (${sale.sarafLedgerCurrency?.code ?? ""})`
      : t("common:rice_sale_cash");

  return (
    <Document>
      <Page size="A4" style={pageStyle}>
        <PdfText
          style={ledgerPdfBaseStyles.title}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        >
          {t("common:store_variety_sale_pdf_title", { billNo: sale.billNo })}
        </PdfText>
        <PdfLabeledValue
          label={t("common:season")}
          value={sale.seasonName}
          style={ledgerPdfBaseStyles.metaRow}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        />
        <PdfLabeledValue
          label={t("common:date")}
          value={dateFormatter(sale.saleDate)}
          style={ledgerPdfBaseStyles.metaRow}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        />
        {sale.variety !== POOLED_SALE_VARIETY ? (
          <PdfLabeledValue
            label={t("common:variety")}
            value={sale.variety}
            style={ledgerPdfBaseStyles.metaRow}
            documentRtl={documentRtl}
            useArabicFont={useArabicFont}
          />
        ) : null}
        <PdfLabeledValue
          label={t("common:store_variety_sale_pdf_weight_sold")}
          value={formatWeightFromKg(sale.soldWeightKg, t)}
          style={ledgerPdfBaseStyles.metaRow}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        />
        <View style={ledgerPdfBaseStyles.section}>
          <PdfLabeledValue
            label={t("common:buyer")}
            value={buyer ? `${buyer.name} — ${buyer.phoneNo}` : sale.buyerCustomerId}
            style={ledgerPdfBaseStyles.metaRow}
            documentRtl={documentRtl}
            useArabicFont={useArabicFont}
          />
          {buyer?.address ? (
            <PdfLabeledValue
              label={t("common:address")}
              value={buyer.address}
              style={ledgerPdfBaseStyles.metaRow}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
            />
          ) : null}
        </View>
        <View style={ledgerPdfBaseStyles.section}>
          <PdfLabeledValue
            label={t("common:sale_amount")}
            value={formatDisplayAmount(sale.saleAmount, locale)}
            style={ledgerPdfBaseStyles.metaRow}
            documentRtl={documentRtl}
            useArabicFont={useArabicFont}
          />
          {Number(sale.loadingAmount ?? 0) > 0 ? (
            <PdfLabeledValue
              label={t("common:rice_sale_loading_amount")}
              value={formatDisplayAmount(sale.loadingAmount ?? "0", locale)}
              style={ledgerPdfBaseStyles.metaRow}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
            />
          ) : null}
          {Number(sale.riceBagsAmount ?? 0) > 0 ? (
            <PdfLabeledValue
              label={t("common:rice_sale_bags_amount")}
              value={formatDisplayAmount(sale.riceBagsAmount ?? "0", locale)}
              style={ledgerPdfBaseStyles.metaRow}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
            />
          ) : null}
          <PdfLabeledValue
            label={t("common:rice_sale_invoice_total")}
            value={formatDisplayAmount(sale.invoiceTotal ?? sale.saleAmount, locale)}
            style={ledgerPdfBaseStyles.metaRow}
            documentRtl={documentRtl}
            useArabicFont={useArabicFont}
          />
          <PdfLabeledValue
            label={t("common:paid_amount")}
            value={formatDisplayAmount(sale.paidAmount, locale)}
            style={ledgerPdfBaseStyles.metaRow}
            documentRtl={documentRtl}
            useArabicFont={useArabicFont}
          />
          <PdfLabeledValue
            label={t("common:remaining_amount")}
            value={formatDisplayAmount(sale.remainingAmount, locale)}
            style={ledgerPdfBaseStyles.metaRow}
            documentRtl={documentRtl}
            useArabicFont={useArabicFont}
          />
          <PdfLabeledValue
            label={t("common:payment")}
            value={paymentLabel}
            style={ledgerPdfBaseStyles.metaRow}
            documentRtl={documentRtl}
            useArabicFont={useArabicFont}
          />
        </View>
        {sale.notes ? (
          <View style={ledgerPdfBaseStyles.section}>
            <PdfLabeledValue
              label={t("common:notes")}
              value={sale.notes}
              style={ledgerPdfBaseStyles.metaRow}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
            />
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export async function buildStoreVarietySalePdfBlob(sale: StoreVarietySale, t: TFunction) {
  const language = getTranslationLanguage(t);
  const locale = getDisplayLocale(language);
  const documentRtl = isRTL(language);
  const useArabicFont = shouldUseArabicPdfFont(
    language,
    sale.buyerCustomer?.name,
    sale.buyerCustomer?.address,
    sale.notes,
    sale.variety,
  );

  return withPdfFonts(language, () =>
    pdf(
      <StoreVarietySalePdfDocument
        sale={sale}
        t={t}
        locale={locale}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
      />,
    ).toBlob(),
  );
}

export function storeVarietySalePdfFileName(sale: StoreVarietySale) {
  return `${sale.billNo.replace(/[^\w-]+/g, "_")}.pdf`;
}

export const openPdfPrintPreview = (blob: Blob, t: TFunction) => {
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, "_blank", "noopener,noreferrer");

  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    throw new Error(t("common:ledger_pdf_preview_error"));
  }

  printWindow.addEventListener("load", () => {
    printWindow.focus();
    printWindow.print();
  });

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60_000);
};
