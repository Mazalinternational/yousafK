import { Document, Page, View, pdf } from "@react-pdf/renderer";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatPdfAmount } from "@/utils/displayLocale";
import {
  PdfLabeledValue,
  PdfText,
  PdfTitle,
  getPdfPageStyle,
  renderLocalizedPdf,
  shouldUseArabicPdfFont,
} from "@/utils/pdfFonts";
import { getTranslationLanguage, isRTL } from "@/i18n";
import { ledgerPdfBaseStyles } from "@/utils/ledgerPdf";
import { formatShamsiMonthLabel } from "@/utils/shamsiCalendar";
import type { EmployeeAccount, EmployeeLedgerEntry } from "../schemas/employee";

export function getEmployeeLedgerEntryLabel(entry: EmployeeLedgerEntry, t: TFunction) {
  return t(`common:${entry.entryType}`);
}

export function formatSalaryEntryPaymentLabel(entry: EmployeeLedgerEntry, t: TFunction) {
  if (entry.entryType !== "salary_payment" && entry.entryType !== "credit_repayment") {
    return "—";
  }

  if (entry.paymentChannel === "saraf") {
    const sarafName = entry.saraf?.name;
    const currency = entry.sarafLedgerCurrency?.code;
    const bits = [
      entry.entryType === "credit_repayment"
        ? t("common:pay_to_saraf")
        : t("common:jwali_paid_by_saraf"),
    ];
    if (sarafName) {
      bits.push(sarafName);
    }
    if (currency) {
      bits.push(currency);
    }
    return bits.join(" · ");
  }

  const currency = entry.sarafLedgerCurrency?.code;
  return currency
    ? `${t("common:pay_in_cash")} · ${currency}`
    : t("common:pay_in_cash");
}

type EmployeeLedgerEntryPdfProps = {
  account: EmployeeAccount;
  entry: EmployeeLedgerEntry;
  t: TFunction;
  documentRtl: boolean;
  useArabicFont: boolean;
};

const EmployeeLedgerEntryPdfDocument = ({
  account,
  entry,
  t,
  documentRtl,
  useArabicFont,
}: EmployeeLedgerEntryPdfProps) => {
  const pdfLanguage = getTranslationLanguage(t);
  const pageStyle = getPdfPageStyle({
    baseStyle: ledgerPdfBaseStyles.page,
    documentRtl,
    useArabicFont,
    language: pdfLanguage,
  });
  const entryLabel = getEmployeeLedgerEntryLabel(entry, t);
  const pdfOpts = { documentRtl, useArabicFont, language: pdfLanguage };
  const documentTitle = t("common:employee_ledger_entry_pdf_title", {
    name: account.employee.name,
    entry: entryLabel,
  });

  return (
    <Document
      title={documentTitle}
      author="YKMIS"
      subject={t("common:employee_ledger_pdf_subject")}
    >
      <Page size="A4" style={pageStyle}>
        <PdfTitle
          primary={account.employee.name}
          suffix={entryLabel}
          style={ledgerPdfBaseStyles.title}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
          language={pdfLanguage}
        />
        <PdfLabeledValue
          label={t("common:position")}
          value={account.employee.position}
          style={ledgerPdfBaseStyles.metaRow}
          {...pdfOpts}
        />
        <PdfLabeledValue
          label={t("common:employee_no")}
          value={account.employee.employeeNo}
          style={ledgerPdfBaseStyles.metaRow}
          {...pdfOpts}
        />
        <PdfLabeledValue
          label={t("common:season")}
          value={account.employee.seasonName}
          style={ledgerPdfBaseStyles.metaRow}
          {...pdfOpts}
        />
        <PdfLabeledValue
          label={t("common:phone_number")}
          value={account.employee.phoneNo}
          style={ledgerPdfBaseStyles.metaRow}
          {...pdfOpts}
        />
        <PdfLabeledValue
          label={t("common:address")}
          value={account.employee.address}
          style={ledgerPdfBaseStyles.metaRow}
          {...pdfOpts}
        />

        <View style={ledgerPdfBaseStyles.section}>
          <PdfText
            style={ledgerPdfBaseStyles.sectionTitle}
            documentRtl={documentRtl}
            useArabicFont={useArabicFont}
            language={pdfLanguage}
          >
            {t("common:salary_ledger_entries")}
          </PdfText>
          <View style={ledgerPdfBaseStyles.entryCard} wrap={false}>
            <PdfText
              style={ledgerPdfBaseStyles.entryTitle}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
              language={pdfLanguage}
            >
              {entryLabel}
            </PdfText>
            <PdfLabeledValue
              label={t("common:salary_month")}
              value={
                entry.entryType === "credit_repayment"
                  ? "—"
                  : formatShamsiMonthLabel(entry.salaryMonth)
              }
              style={ledgerPdfBaseStyles.entryLine}
              {...pdfOpts}
            />
            <PdfLabeledValue
              label={t("common:date")}
              value={dateFormatter(entry.occurredAt)}
              style={ledgerPdfBaseStyles.entryLine}
              {...pdfOpts}
            />
            <PdfLabeledValue
              label={t("common:amount")}
              value={formatPdfAmount(entry.amount)}
              style={ledgerPdfBaseStyles.entryLine}
              {...pdfOpts}
            />
            {entry.entryType === "salary_payment" ||
            entry.entryType === "credit_repayment" ? (
              <PdfLabeledValue
                label={t("common:payment")}
                value={formatSalaryEntryPaymentLabel(entry, t)}
                style={ledgerPdfBaseStyles.entryLine}
                {...pdfOpts}
              />
            ) : null}
            {entry.entryType === "salary_payment" ? (
              <PdfLabeledValue
                label={t("common:salary_advance")}
                value={
                  entry.isAdvance ? t("common:salary_advance") : "—"
                }
                style={ledgerPdfBaseStyles.entryLine}
                {...pdfOpts}
              />
            ) : null}
            {entry.notes ? (
              <PdfLabeledValue
                label={t("common:notes")}
                value={entry.notes}
                style={ledgerPdfBaseStyles.entryLine}
                {...pdfOpts}
              />
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
};

export async function buildEmployeeLedgerEntryPdfBlob(
  account: EmployeeAccount,
  entry: EmployeeLedgerEntry,
  t: TFunction,
) {
  const language = getTranslationLanguage(t);
  const documentRtl = isRTL(language);
  const useArabicFont = shouldUseArabicPdfFont(
    language,
    account.employee.name,
    account.employee.position,
    account.employee.address,
    entry.notes,
    entry.saraf?.name,
  );
  const needsArabicFonts = documentRtl || useArabicFont;

  return renderLocalizedPdf(
    () =>
      pdf(
        <EmployeeLedgerEntryPdfDocument
          account={account}
          entry={entry}
          t={t}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        />,
      ).toBlob(),
    { needsArabicFonts, language },
  );
}

export function employeeLedgerEntryPdfFileName(
  employeeName: string,
  entry: EmployeeLedgerEntry,
) {
  const datePart = entry.occurredAt.slice(0, 10);
  const slug =
    employeeName.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase() ||
    "employee";
  const typePart = entry.entryType.replace(/_/g, "-");
  const currencyPart = entry.sarafLedgerCurrency?.code
    ? `-${entry.sarafLedgerCurrency.code}`
    : "";
  return `${slug}-${typePart}${currencyPart}-${datePart}.pdf`;
}
