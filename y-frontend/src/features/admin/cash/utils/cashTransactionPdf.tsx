import { Document, Page, View, pdf } from "@react-pdf/renderer";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatCurrencyTitle } from "@/utils/currencyDisplay";
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
import type { CashTransaction } from "../schemas/cash";

type CashTransactionPdfProps = {
  transaction: CashTransaction;
  t: TFunction;
  documentRtl: boolean;
  useArabicFont: boolean;
};

const CashTransactionPdfDocument = ({
  transaction,
  t,
  documentRtl,
  useArabicFont,
}: CashTransactionPdfProps) => {
  const locale = getDisplayLocale(getTranslationLanguage(t));
  const pageStyle = getPdfPageStyle({
    baseStyle: ledgerPdfBaseStyles.page,
    documentRtl,
    useArabicFont,
  });
  const directionLabel =
    transaction.direction === "in" ? t("common:cash_in") : t("common:cash_out");
  const formattedAmount = formatDisplayAmount(transaction.amount, locale);
  const currencyTitle = formatCurrencyTitle(
    transaction.currencyCode,
    transaction.currencyName,
    t,
  );

  return (
    <Document
      title={`${directionLabel} — ${formattedAmount} ${transaction.currencyCode}`}
      author="YKMIS"
      subject={t("admin:cash_transaction")}
    >
      <Page size="A4" style={pageStyle}>
        <PdfText
          style={ledgerPdfBaseStyles.title}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        >
          {t("admin:cash_transaction")}
        </PdfText>
        {transaction.seasonName ? (
          <PdfLabeledValue
            label={t("common:season")}
            value={transaction.seasonName}
            style={ledgerPdfBaseStyles.metaRow}
            documentRtl={documentRtl}
            useArabicFont={useArabicFont}
          />
        ) : null}

        <View style={ledgerPdfBaseStyles.section}>
          <PdfText
            style={ledgerPdfBaseStyles.sectionTitle}
            documentRtl={documentRtl}
            useArabicFont={useArabicFont}
          >
            {t("sidebar:cash:records")}
          </PdfText>
          <View style={ledgerPdfBaseStyles.entryCard} wrap={false}>
            <PdfLabeledValue
              label={t("common:date")}
              value={dateFormatter(transaction.occurredAt)}
              style={ledgerPdfBaseStyles.entryLine}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
            />
            <PdfLabeledValue
              label={t("common:cash_direction")}
              value={directionLabel}
              style={ledgerPdfBaseStyles.entryLine}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
            />
            <PdfLabeledValue
              label={t("common:amount")}
              value={`${formattedAmount} ${transaction.currencyCode}`}
              style={ledgerPdfBaseStyles.entryLine}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
            />
            <PdfLabeledValue
              label={t("common:currency")}
              value={currencyTitle}
              style={ledgerPdfBaseStyles.entryLine}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
            />
            {transaction.notes ? (
              <PdfLabeledValue
                label={t("common:notes")}
                value={transaction.notes}
                style={ledgerPdfBaseStyles.entryLine}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
              />
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
};

export async function buildCashTransactionPdfBlob(transaction: CashTransaction, t: TFunction) {
  const language = getTranslationLanguage(t);
  const documentRtl = isRTL(language);
  const useArabicFont = shouldUseArabicPdfFont(language, transaction.notes);

  return withPdfFonts(language, () =>
    pdf(
      <CashTransactionPdfDocument
        transaction={transaction}
        t={t}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
      />,
    ).toBlob(),
  );
}

export function cashTransactionPdfFileName(transaction: CashTransaction) {
  const datePart = transaction.occurredAt.slice(0, 10);
  return `cash-${transaction.direction}-${transaction.currencyCode}-${datePart}.pdf`;
}

export function cashTransactionPdfShareTitle(transaction: CashTransaction, t: TFunction) {
  const locale = getDisplayLocale(getTranslationLanguage(t));
  const directionLabel =
    transaction.direction === "in" ? t("common:cash_in") : t("common:cash_out");
  return `${directionLabel} — ${formatDisplayAmount(transaction.amount, locale)} ${transaction.currencyCode}`;
}
