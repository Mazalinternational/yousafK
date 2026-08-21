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
import { formatQuantityWithUnit } from "@/utils/weightUnit";
import type { CustomerAccount, CustomerLedgerEntry } from "../schemas/customer";

const isRiceWarehouseLedgerEntry = (
  entry: Pick<CustomerLedgerEntry, "id" | "sourceRiceWarehouseId">,
) => Boolean(entry.sourceRiceWarehouseId) || entry.id.startsWith("rice-warehouse-");

export function getCustomerLedgerEntryLabel(entry: CustomerLedgerEntry, t: TFunction) {
  if (isRiceWarehouseLedgerEntry(entry)) {
    return entry.entryType === "company_payment"
      ? t("common:ledger_entry_rice_warehouse_payment")
      : t("common:ledger_entry_rice_warehouse_purchase");
  }

  switch (entry.entryType) {
    case "company_receivable":
      return t("common:ledger_entry_company_receivable");
    case "company_payment":
      return t("common:ledger_entry_company_payment");
    case "company_payment_on_behalf":
      return t("common:ledger_entry_company_payment_on_behalf");
    case "company_payment_received_on_behalf":
      return t("common:ledger_entry_company_payment_received_on_behalf");
    case "vendor_expense":
      return t("common:ledger_entry_vendor_expense");
    case "vendor_payment":
      return t("common:ledger_entry_vendor_payment");
    case "debtor_disbursement":
      return t("common:ledger_entry_debtor_disbursement");
    case "debtor_repayment":
      return t("common:ledger_entry_debtor_repayment");
    case "farmer_obligation":
      return t("common:ledger_entry_farmer_obligation");
    case "farmer_rice_return":
      return t("common:ledger_entry_farmer_rice_return");
    case "buyer_rice_sale":
      return t("common:ledger_entry_rice_sale");
    case "buyer_payment":
      return t("common:ledger_entry_buyer_payment");
    case "buyer_payment_on_behalf":
      return t("common:ledger_entry_buyer_payment_on_behalf");
    case "buyer_payment_received_on_behalf":
      return t("common:ledger_entry_buyer_payment_received_on_behalf");
    case "buyer_debit":
      return t("common:ledger_entry_buyer_debit");
    case "buyer_credit":
      return t("common:ledger_entry_buyer_credit");
    case "seller_debit":
      return t("common:ledger_entry_seller_debit");
    case "seller_credit":
      return t("common:ledger_entry_seller_credit");
    case "process_production_store_sale":
      return t("common:ledger_entry_store_variety_sale");
    default:
      return entry.entryType;
  }
}

const RECEIVABLE_BUYER_ENTRY_TYPES = new Set([
  "buyer_rice_sale",
  "buyer_payment",
  "buyer_payment_on_behalf",
  "buyer_payment_received_on_behalf",
  "buyer_debit",
  "buyer_credit",
  "process_production_store_sale",
]);

export type LedgerPdfPaymentLine =
  | { kind: "labeled"; label: string; value: string }
  | { kind: "text"; text: string };

export function formatEntryPaymentLines(entry: CustomerLedgerEntry, t: TFunction) {
  const lines: LedgerPdfPaymentLine[] = [];
  const useBuyerPaymentLabels =
    RECEIVABLE_BUYER_ENTRY_TYPES.has(entry.entryType) ||
    entry.entryType === "debtor_repayment";

  if (entry.entryType === "buyer_payment_on_behalf" && entry.counterpartyCustomerName) {
    lines.push({
      kind: "labeled",
      label: t("common:pay_on_behalf_of"),
      value: entry.counterpartyCustomerName,
    });
  } else if (entry.entryType === "company_payment_on_behalf" && entry.counterpartyCustomerName) {
    lines.push({
      kind: "labeled",
      label: t("common:seller_transfer_to"),
      value: entry.counterpartyCustomerName,
    });
  } else if (
    (entry.entryType === "buyer_payment_received_on_behalf" ||
      entry.entryType === "buyer_payment") &&
    entry.counterpartyCustomerName
  ) {
    lines.push({
      kind: "labeled",
      label: t("common:received_via_payer_on_behalf"),
      value: entry.counterpartyCustomerName,
    });
  } else if (
    entry.entryType === "company_payment_received_on_behalf" &&
    entry.counterpartyCustomerName
  ) {
    lines.push({
      kind: "labeled",
      label: t("common:seller_transfer_from"),
      value: entry.counterpartyCustomerName,
    });
  }

  if (entry.paymentType) {
    lines.push({
      kind: "labeled",
      label: t("common:payment_type"),
      value: t(`common:${entry.paymentType}`),
    });
  }

  if (
    entry.entryType !== "buyer_payment_on_behalf" &&
    entry.entryType !== "buyer_payment_received_on_behalf" &&
    entry.entryType !== "company_payment_on_behalf" &&
    entry.entryType !== "company_payment_received_on_behalf" &&
    (entry.entryType === "vendor_payment" ||
      entry.entryType === "company_payment" ||
      entry.entryType === "buyer_payment" ||
      entry.entryType === "debtor_disbursement" ||
      entry.entryType === "debtor_repayment")
  ) {
    if (entry.paymentChannel === "saraf" && entry.sarafName) {
      lines.push({
        kind: "labeled",
        label: useBuyerPaymentLabels ? t("common:pay_to_saraf") : t("common:jwali_paid_by_saraf"),
        value: entry.sarafName,
      });
    } else if (entry.paymentChannel === "cash") {
      lines.push({
        kind: "text",
        text: useBuyerPaymentLabels ? t("common:pay_in_cash") : t("common:jwali_paid_by_cash"),
      });
    }
  } else if (
    entry.entryType === "buyer_debit" ||
    entry.entryType === "buyer_credit" ||
    entry.entryType === "seller_debit" ||
    entry.entryType === "seller_credit"
  ) {
    lines.push({
      kind: "text",
      text: t("common:buyer_adjustment_ledger_only"),
    });
    if (entry.currencyCode) {
      lines.push({
        kind: "text",
        text: entry.currencyCode,
      });
    }
  } else if (
    entry.entryType === "buyer_payment_on_behalf" ||
    entry.entryType === "buyer_payment_received_on_behalf" ||
    entry.entryType === "company_payment_on_behalf" ||
    entry.entryType === "company_payment_received_on_behalf"
  ) {
    lines.push({
      kind: "text",
      text: entry.entryType.startsWith("company_payment")
        ? t("common:seller_balance_transfer")
        : t("common:buyer_balance_transfer"),
    });
  }

  if (entry.paidAmount && entry.paymentType === "partial_paid") {
    lines.push({
      kind: "labeled",
      label: t("common:paid_amount"),
      value: formatPdfAmount(entry.paidAmount),
    });
  }

  if (
    entry.remainingAmount &&
    (entry.paymentType === "partial_paid" || entry.paymentType === "remaining")
  ) {
    lines.push({
      kind: "labeled",
      label: t("common:remaining"),
      value: formatPdfAmount(entry.remainingAmount),
    });
  }

  if (entry.entryType === "farmer_rice_return") {
    lines.push({
      kind: "text",
      text: entry.riceStockFulfilledAt
        ? t("common:farmer_ledger_filter_returned")
        : t("common:farmer_ledger_filter_pending_return"),
    });
  }

  return lines;
}

type CustomerLedgerEntryPdfProps = {
  account: CustomerAccount;
  entry: CustomerLedgerEntry;
  t: TFunction;
  documentRtl: boolean;
  useArabicFont: boolean;
};

const CustomerLedgerEntryPdfDocument = ({
  account,
  entry,
  t,
  documentRtl,
  useArabicFont,
}: CustomerLedgerEntryPdfProps) => {
  const pdfLanguage = getTranslationLanguage(t);
  const pageStyle = getPdfPageStyle({
    baseStyle: ledgerPdfBaseStyles.page,
    documentRtl,
    useArabicFont,
    language: pdfLanguage,
  });
  const entryLabel = getCustomerLedgerEntryLabel(entry, t);
  const paymentLines = formatEntryPaymentLines(entry, t);
  const pdfOpts = { documentRtl, useArabicFont, language: pdfLanguage };
  const documentTitle = t("common:customer_ledger_entry_pdf_title", {
    name: account.customer.name,
    entry: entryLabel,
  });

  return (
    <Document
      title={documentTitle}
      author="YKMIS"
      subject={t("common:customer_ledger_pdf_subject")}
    >
      <Page size="A4" style={pageStyle}>
        <PdfTitle
          primary={account.customer.name}
          suffix={entryLabel}
          style={ledgerPdfBaseStyles.title}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
          language={pdfLanguage}
        />
        <PdfLabeledValue
          label={t("common:type")}
          value={t(`common:${account.customer.type}`)}
          style={ledgerPdfBaseStyles.metaRow}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
          language={pdfLanguage}
        />
        <PdfLabeledValue
          label={t("common:season")}
          value={account.customer.seasonName}
          style={ledgerPdfBaseStyles.metaRow}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
          language={pdfLanguage}
        />
        <PdfLabeledValue
          label={t("common:phone_number")}
          value={account.customer.phoneNo ?? ""}
          style={ledgerPdfBaseStyles.metaRow}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
          language={pdfLanguage}
        />
        <PdfLabeledValue
          label={t("common:address")}
          value={account.customer.address ?? ""}
          style={ledgerPdfBaseStyles.metaRow}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
          language={pdfLanguage}
        />

        <View style={ledgerPdfBaseStyles.section}>
          <PdfText
            style={ledgerPdfBaseStyles.sectionTitle}
            documentRtl={documentRtl}
            useArabicFont={useArabicFont}
            language={pdfLanguage}
          >
            {t("common:ledger_entries")}
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
              label={t("common:date")}
              value={dateFormatter(entry.occurredAt)}
              style={ledgerPdfBaseStyles.entryLine}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
              language={pdfLanguage}
            />
            {entry.billNo ? (
              <PdfLabeledValue
                label={t("common:bill_no")}
                value={entry.billNo}
                style={ledgerPdfBaseStyles.entryLine}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
                language={pdfLanguage}
              />
            ) : null}
            {entry.amount ? (
              <PdfLabeledValue
                label={t("common:amount")}
                value={formatPdfAmount(entry.amount)}
                style={ledgerPdfBaseStyles.entryLine}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
                language={pdfLanguage}
              />
            ) : null}
            {entry.currencyCode ? (
              <PdfLabeledValue
                label={t("common:currency")}
                value={entry.currencyCode}
                style={ledgerPdfBaseStyles.entryLine}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
                language={pdfLanguage}
              />
            ) : null}
            {entry.currencyName ? (
              <PdfLabeledValue
                label={t("common:currency_name")}
                value={entry.currencyName}
                style={ledgerPdfBaseStyles.entryLine}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
                language={pdfLanguage}
              />
            ) : null}
            {paymentLines.map((line, lineIndex) =>
              line.kind === "labeled" ? (
                <PdfLabeledValue
                  key={`${entry.id}-payment-${lineIndex}`}
                  label={line.label}
                  value={line.value}
                  style={ledgerPdfBaseStyles.entryLine}
                  documentRtl={documentRtl}
                  useArabicFont={useArabicFont}
                  language={pdfLanguage}
                />
              ) : (
                <PdfText
                  key={`${entry.id}-payment-${lineIndex}`}
                  style={ledgerPdfBaseStyles.entryLine}
                  documentRtl={documentRtl}
                  useArabicFont={useArabicFont}
                  language={pdfLanguage}
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
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
                language={pdfLanguage}
              />
            ) : null}
            {entry.paddyQuantity ? (
              <PdfLabeledValue
                label={t("common:paddy_quantity")}
                value={formatQuantityWithUnit(entry.paddyQuantity, entry.unit ?? undefined, t)}
                style={ledgerPdfBaseStyles.entryLine}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
                language={pdfLanguage}
              />
            ) : null}
            {entry.riceVariety ? (
              <PdfLabeledValue
                label={t("common:rice_variety")}
                value={entry.riceVariety}
                style={ledgerPdfBaseStyles.entryLine}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
                language={pdfLanguage}
              />
            ) : null}
            {entry.riceQuantity ? (
              <PdfLabeledValue
                label={t("common:rice")}
                value={formatQuantityWithUnit(entry.riceQuantity, entry.unit ?? undefined, t)}
                style={ledgerPdfBaseStyles.entryLine}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
                language={pdfLanguage}
              />
            ) : null}
            {entry.scheduledFor ? (
              <PdfLabeledValue
                label={t("common:scheduled")}
                value={dateFormatter(entry.scheduledFor)}
                style={ledgerPdfBaseStyles.entryLine}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
                language={pdfLanguage}
              />
            ) : null}
            {entry.notes ? (
              <PdfLabeledValue
                label={t("common:notes")}
                value={entry.notes}
                style={ledgerPdfBaseStyles.entryLine}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
                language={pdfLanguage}
              />
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
};

export async function buildCustomerLedgerEntryPdfBlob(
  account: CustomerAccount,
  entry: CustomerLedgerEntry,
  t: TFunction,
) {
  const language = getTranslationLanguage(t);
  const documentRtl = isRTL(language);
  const useArabicFont = shouldUseArabicPdfFont(
    language,
    account.customer.name,
    account.customer.address,
    entry.notes,
    entry.riceVariety,
    entry.paddyVariety,
  );

  const needsArabicFonts = documentRtl || useArabicFont;

  return renderLocalizedPdf(
    () =>
      pdf(
        <CustomerLedgerEntryPdfDocument
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

export function customerLedgerEntryPdfFileName(
  customerName: string,
  entry: CustomerLedgerEntry,
) {
  const datePart = entry.occurredAt.slice(0, 10);
  const slug =
    customerName.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase() ||
    "customer";
  const typePart = entry.entryType.replace(/_/g, "-");
  const currencyPart = entry.currencyCode ? `-${entry.currencyCode}` : "";
  return `${slug}-${typePart}${currencyPart}-${datePart}.pdf`;
}
