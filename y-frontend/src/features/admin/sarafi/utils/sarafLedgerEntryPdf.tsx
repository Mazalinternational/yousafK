import { Document, Page, View, pdf } from "@react-pdf/renderer";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatDisplayAmount, getDisplayLocale } from "@/utils/displayLocale";
import {
  PdfLabeledValue,
  PdfText,
  PdfTitle,
  getPdfPageStyle,
  shouldUseArabicPdfFont,
  withPdfFonts,
} from "@/utils/pdfFonts";
import { getTranslationLanguage, isRTL } from "@/i18n";
import { ledgerPdfBaseStyles } from "@/utils/ledgerPdf";
import type { SarafAccount, SarafLedgerEntry } from "../schemas/sarafi";

export function getSarafEntryLinkedBill(entry: SarafLedgerEntry, t: TFunction) {
  return (
    entry.riceSaleBillNo ??
    entry.companyPaddyWarehouseBillNo ??
    (entry.employeeSalaryEmployeeNo
      ? `${entry.employeeSalaryEmployeeName ?? t("common:salary_payment")} (${entry.employeeSalaryEmployeeNo})`
      : null) ??
    (entry.jwaliPaymentJwaliName
      ? `${t("common:jwali_paid_by_saraf")} — ${entry.jwaliPaymentJwaliName}`
      : null) ??
    "—"
  );
}

type SarafEntryPdfProps = {
  account: SarafAccount;
  entry: SarafLedgerEntry;
  t: TFunction;
  documentRtl: boolean;
  useArabicFont: boolean;
};

const SarafLedgerEntryPdfDocument = ({
  account,
  entry,
  t,
  documentRtl,
  useArabicFont,
}: SarafEntryPdfProps) => {
  const locale = getDisplayLocale(getTranslationLanguage(t));
  const pageStyle = getPdfPageStyle({
    baseStyle: ledgerPdfBaseStyles.page,
    documentRtl,
    useArabicFont,
  });
  const entryLabel = t("common:sarafi_cash_entry");
  const documentTitle = t("common:sarafi_ledger_pdf_title", {
    name: account.saraf.name,
    entry: entryLabel,
  });

  return (
    <Document
      title={documentTitle}
      author="YKMIS"
      subject={t("common:sarafi_ledger_pdf_subject")}
    >
      <Page size="A4" style={pageStyle}>
        <PdfTitle
          primary={account.saraf.name}
          suffix={entryLabel}
          style={ledgerPdfBaseStyles.title}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        />
        <PdfLabeledValue
          label={t("common:season")}
          value={account.saraf.seasonName}
          style={ledgerPdfBaseStyles.metaRow}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        />
        <PdfLabeledValue
          label={t("common:phone_number")}
          value={account.saraf.phoneNo}
          style={ledgerPdfBaseStyles.metaRow}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        />
        <PdfLabeledValue
          label={t("common:address")}
          value={account.saraf.address}
          style={ledgerPdfBaseStyles.metaRow}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        />

        <View style={ledgerPdfBaseStyles.section}>
          <PdfText
            style={ledgerPdfBaseStyles.sectionTitle}
            documentRtl={documentRtl}
            useArabicFont={useArabicFont}
          >
            {t("common:sarafi_ledger_entries")}
          </PdfText>
          <View style={ledgerPdfBaseStyles.entryCard} wrap={false}>
            <PdfLabeledValue
              label={t("common:date")}
              value={dateFormatter(entry.occurredAt)}
              style={ledgerPdfBaseStyles.entryLine}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
            />
            <PdfLabeledValue
              label={t("common:currency")}
              value={`${entry.currencyCode} — ${entry.currencyName}`}
              style={ledgerPdfBaseStyles.entryLine}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
            />
            <PdfLabeledValue
              label={t("common:amount")}
              value={`${formatDisplayAmount(entry.amount, locale)} ${entry.currencyCode}`}
              style={ledgerPdfBaseStyles.entryLine}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
            />
            <PdfLabeledValue
              label={t("common:sarafi_ledger_linked_bill")}
              value={getSarafEntryLinkedBill(entry, t)}
              style={ledgerPdfBaseStyles.entryLine}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
            />
            {entry.notes ? (
              <PdfLabeledValue
                label={t("common:notes")}
                value={entry.notes}
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

export async function buildSarafLedgerEntryPdfBlob(
  account: SarafAccount,
  entry: SarafLedgerEntry,
  t: TFunction,
) {
  const documentRtl = isRTL(getTranslationLanguage(t));
  const useArabicFont = shouldUseArabicPdfFont(
    getTranslationLanguage(t),
    account.saraf.name,
    account.saraf.address,
    entry.notes,
  );

  const language = getTranslationLanguage(t);

  return withPdfFonts(language, () =>
    pdf(
      <SarafLedgerEntryPdfDocument
        account={account}
        entry={entry}
        t={t}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
      />,
    ).toBlob(),
  );
}

export function sarafLedgerEntryPdfFileName(
  sarafName: string,
  entry: SarafLedgerEntry,
) {
  const datePart = entry.occurredAt.slice(0, 10);
  const slug =
    sarafName.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase() ||
    "saraf";
  return `${slug}-entry-${entry.currencyCode}-${datePart}.pdf`;
}

export function sarafLedgerEntryPdfShareTitle(
  sarafName: string,
  entry: SarafLedgerEntry,
  t: TFunction,
) {
  const locale = getDisplayLocale(getTranslationLanguage(t));
  return t("common:sarafi_ledger_pdf_share_title", {
    name: sarafName,
    amount: formatDisplayAmount(entry.amount, locale),
    currency: entry.currencyCode,
  });
}
