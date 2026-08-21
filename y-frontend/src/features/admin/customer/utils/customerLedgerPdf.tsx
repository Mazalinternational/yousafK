import { Document, Page, View, pdf } from "@react-pdf/renderer";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatPdfAmount, formatPdfFieldValue, parseLocalizedNumberString } from "@/utils/displayLocale";
import {
  PdfIndexedLabel,
  PdfLabeledValue,
  PdfText,
  PdfTitle,
  getPdfPageStyle,
  renderLocalizedPdf,
  shouldUseArabicPdfFont,
} from "@/utils/pdfFonts";
import { getTranslationLanguage, isRTL } from "@/i18n";
import { ledgerPdfBaseStyles, sanitizeLedgerFileName } from "@/utils/ledgerPdf";
import { formatQuantityWithUnit } from "@/utils/weightUnit";
import type { CustomerAccount } from "../schemas/customer";
import {
  formatEntryPaymentLines,
  getCustomerLedgerEntryLabel,
} from "./customerLedgerEntryPdf";

type CustomerLedgerPdfProps = {
  account: CustomerAccount;
  summaryCards: Array<{ label: string; value: string }>;
  t: TFunction;
  documentRtl: boolean;
  useArabicFont: boolean;
};

type ParsedSummaryCard = {
  label: string;
  primaryValue: string;
  currencyCode?: string;
};

function parseSummaryCardForPdf(card: { label: string; value: string }): ParsedSummaryCard {
  const labelCurrencyMatch = card.label.match(/ \(([A-Z]{3})\)$/);
  const label = labelCurrencyMatch
    ? card.label.slice(0, card.label.length - labelCurrencyMatch[0].length)
    : card.label;

  const valueTrimmed = card.value.trim();
  const valueCurrencyMatch = valueTrimmed.match(/^(.+?)\s+([A-Z]{3})$/);
  if (valueCurrencyMatch) {
    const parsed = parseLocalizedNumberString(valueCurrencyMatch[1]);
    return {
      label,
      primaryValue: parsed !== null ? formatPdfAmount(parsed) : formatPdfFieldValue(valueCurrencyMatch[1].trim()),
      currencyCode: valueCurrencyMatch[2],
    };
  }

  return { label, primaryValue: formatPdfFieldValue(valueTrimmed) };
}

const CustomerLedgerPdfDocument = ({
  account,
  summaryCards,
  t,
  documentRtl,
  useArabicFont,
}: CustomerLedgerPdfProps) => {
  const pdfLanguage = getTranslationLanguage(t);
  const pageStyle = getPdfPageStyle({
    baseStyle: ledgerPdfBaseStyles.page,
    documentRtl,
    useArabicFont,
    language: pdfLanguage,
  });
  const ledgerSubject = t("common:customer_ledger_pdf_subject");
  const pdfOpts = { documentRtl, useArabicFont, language: pdfLanguage };

  return (
    <Document
      title={t("common:customer_ledger_pdf_title", { name: account.customer.name })}
      author="YKMIS"
      subject={ledgerSubject}
    >
      <Page size="A4" style={pageStyle}>
        <PdfTitle
          primary={account.customer.name}
          suffix={ledgerSubject}
          style={ledgerPdfBaseStyles.title}
          {...pdfOpts}
        />
        <PdfLabeledValue
          label={t("common:type")}
          value={t(`common:${account.customer.type}`)}
          style={ledgerPdfBaseStyles.metaRow}
          {...pdfOpts}
        />
        <PdfLabeledValue
          label={t("common:season")}
          value={account.customer.seasonName}
          style={ledgerPdfBaseStyles.metaRow}
          {...pdfOpts}
        />
        <PdfLabeledValue
          label={t("common:phone_number")}
          value={account.customer.phoneNo ?? ""}
          style={ledgerPdfBaseStyles.metaRow}
          {...pdfOpts}
        />
        <PdfLabeledValue
          label={t("common:address")}
          value={account.customer.address ?? ""}
          style={ledgerPdfBaseStyles.metaRow}
          {...pdfOpts}
        />

        <View style={ledgerPdfBaseStyles.section}>
          <PdfText style={ledgerPdfBaseStyles.sectionTitle} {...pdfOpts}>
            {t("common:customer_ledger_pdf_summary")}
          </PdfText>
          <View style={ledgerPdfBaseStyles.summaryGrid}>
            {summaryCards.map((card) => {
              const parsed = parseSummaryCardForPdf(card);
              return (
                <View key={card.label} style={ledgerPdfBaseStyles.summaryCard}>
                  <PdfLabeledValue
                    label={parsed.label}
                    value={parsed.primaryValue}
                    style={{ marginBottom: 4 }}
                    {...pdfOpts}
                  />
                  {parsed.currencyCode ? (
                    <PdfLabeledValue
                      label={t("common:currency")}
                      value={parsed.currencyCode}
                      style={{ marginBottom: 0 }}
                      {...pdfOpts}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        <View style={ledgerPdfBaseStyles.section}>
          <PdfText style={ledgerPdfBaseStyles.sectionTitle} {...pdfOpts}>
            {t("common:ledger_entries")}
          </PdfText>
          {account.ledger.entries.length === 0 ? (
            <PdfText style={ledgerPdfBaseStyles.emptyState} {...pdfOpts}>
              {t("common:no_ledger_entries")}
            </PdfText>
          ) : (
            account.ledger.entries.map((entry, index) => {
              const entryLabel = getCustomerLedgerEntryLabel(entry, t);
              const paymentLines = formatEntryPaymentLines(entry, t);

              return (
                <View key={entry.id} style={ledgerPdfBaseStyles.entryCard} wrap={false}>
                  <PdfIndexedLabel
                    index={index}
                    label={entryLabel}
                    style={ledgerPdfBaseStyles.entryTitle}
                    {...pdfOpts}
                  />
                  <PdfLabeledValue
                    label={t("common:date")}
                    value={dateFormatter(entry.occurredAt)}
                    style={ledgerPdfBaseStyles.entryLine}
                    {...pdfOpts}
                  />
                  {entry.billNo ? (
                    <PdfLabeledValue
                      label={t("common:bill_no")}
                      value={entry.billNo}
                      style={ledgerPdfBaseStyles.entryLine}
                      {...pdfOpts}
                    />
                  ) : null}
                  {entry.amount ? (
                    <PdfLabeledValue
                      label={t("common:amount")}
                      value={formatPdfAmount(entry.amount)}
                      style={ledgerPdfBaseStyles.entryLine}
                      {...pdfOpts}
                    />
                  ) : null}
                  {entry.currencyCode ? (
                    <PdfLabeledValue
                      label={t("common:currency")}
                      value={entry.currencyCode}
                      style={ledgerPdfBaseStyles.entryLine}
                      {...pdfOpts}
                    />
                  ) : null}
                  {entry.currencyName ? (
                    <PdfLabeledValue
                      label={t("common:currency_name")}
                      value={entry.currencyName}
                      style={ledgerPdfBaseStyles.entryLine}
                      {...pdfOpts}
                    />
                  ) : null}
                  {paymentLines.map((line, lineIndex) =>
                    line.kind === "labeled" ? (
                      <PdfLabeledValue
                        key={`${entry.id}-payment-${lineIndex}`}
                        label={line.label}
                        value={line.value}
                        style={ledgerPdfBaseStyles.entryLine}
                        {...pdfOpts}
                      />
                    ) : (
                      <PdfText
                        key={`${entry.id}-payment-${lineIndex}`}
                        style={ledgerPdfBaseStyles.entryLine}
                        {...pdfOpts}
                      >
                        {line.text}
                      </PdfText>
                    ),
                  )}
                  {entry.paddyVariety ? (
                    <PdfLabeledValue
                      label={t("common:paddy_variety")}
                      value={entry.paddyVariety}
                      style={ledgerPdfBaseStyles.entryLine}
                      {...pdfOpts}
                    />
                  ) : null}
                  {entry.paddyQuantity ? (
                    <PdfLabeledValue
                      label={t("common:paddy_quantity")}
                      value={formatQuantityWithUnit(
                        entry.paddyQuantity ?? "",
                        entry.unit ?? undefined,
                        t,
                      )}
                      style={ledgerPdfBaseStyles.entryLine}
                      {...pdfOpts}
                    />
                  ) : null}
                  {entry.riceVariety ? (
                    <PdfLabeledValue
                      label={t("common:rice_variety")}
                      value={entry.riceVariety}
                      style={ledgerPdfBaseStyles.entryLine}
                      {...pdfOpts}
                    />
                  ) : null}
                  {entry.riceQuantity ? (
                    <PdfLabeledValue
                      label={t("common:rice")}
                      value={formatQuantityWithUnit(
                        entry.riceQuantity ?? "",
                        entry.unit ?? undefined,
                        t,
                      )}
                      style={ledgerPdfBaseStyles.entryLine}
                      {...pdfOpts}
                    />
                  ) : null}
                  {entry.scheduledFor ? (
                    <PdfLabeledValue
                      label={t("common:scheduled")}
                      value={dateFormatter(entry.scheduledFor)}
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
              );
            })
          )}
        </View>
      </Page>
    </Document>
  );
};

export async function buildCustomerLedgerPdfBlob(
  account: CustomerAccount,
  summaryCards: Array<{ label: string; value: string }>,
  t: TFunction,
) {
  const language = getTranslationLanguage(t);
  const documentRtl = isRTL(language);
  const useArabicFont = shouldUseArabicPdfFont(
    language,
    account.customer.name,
    account.customer.address,
    ...account.ledger.entries.map((entry) => entry.notes),
    ...account.ledger.entries.map((entry) => entry.riceVariety),
    ...account.ledger.entries.map((entry) => entry.paddyVariety),
  );

  const needsArabicFonts = documentRtl || useArabicFont;

  return renderLocalizedPdf(
    () =>
      pdf(
        <CustomerLedgerPdfDocument
          account={account}
          summaryCards={summaryCards}
          t={t}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        />,
      ).toBlob(),
    { needsArabicFonts, language },
  );
}

export function customerLedgerPdfFileName(customerName: string) {
  return sanitizeLedgerFileName(customerName, "ledger");
}
