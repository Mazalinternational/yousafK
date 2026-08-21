import { Document, Page, View, pdf } from "@react-pdf/renderer";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatCurrencyTitle } from "@/utils/currencyDisplay";
import {
  formatDisplayAmount,
  formatDisplayNumber,
  getDisplayLocale,
} from "@/utils/displayLocale";
import {
  PdfIndexedLabel,
  PdfLabeledValue,
  PdfText,
  PdfTitle,
  getPdfPageStyle,
  shouldUseArabicPdfFont,
  withPdfFonts,
} from "@/utils/pdfFonts";
import { getTranslationLanguage, isRTL } from "@/i18n";
import { ledgerPdfBaseStyles, sanitizeLedgerFileName } from "@/utils/ledgerPdf";
import type { JwaliAccount, JwaliPayment } from "../schemas/jwali";
import type { z } from "zod";
import { JwaliLedgerEntrySchema } from "../schemas/jwali";

const formatJwaliPayment = (payment: JwaliPayment, t: TFunction) => {
  const currencyCode =
    payment.currency?.code ?? payment.sarafLedgerCurrency?.code ?? null;

  if (payment.paymentChannel === "saraf") {
    const bits = [t("common:jwali_paid_by_saraf")];
    if (payment.saraf?.name) {
      bits.push(payment.saraf.name);
    }
    if (currencyCode) {
      bits.push(currencyCode);
    }
    return bits.join(" · ");
  }

  return currencyCode
    ? `${t("common:jwali_paid_by_cash")} · ${currencyCode}`
    : t("common:jwali_paid_by_cash");
};

type JwaliLedgerPdfProps = {
  account: JwaliAccount;
  summaryCards: Array<{ label: string; value: string }>;
  t: TFunction;
  documentRtl: boolean;
  useArabicFont: boolean;
  section?: "full" | "entries" | "payments";
};

const JwaliLedgerPdfDocument = ({
  account,
  summaryCards,
  t,
  documentRtl,
  useArabicFont,
  section = "full",
}: JwaliLedgerPdfProps) => {
  const locale = getDisplayLocale(getTranslationLanguage(t));
  const pageStyle = getPdfPageStyle({
    baseStyle: ledgerPdfBaseStyles.page,
    documentRtl,
    useArabicFont,
  });
  const ledgerLabel = t("common:jwali_ledger");

  return (
    <Document
      title={t("common:jwali_ledger_pdf_title", { name: account.jwali.name, ledger: ledgerLabel })}
      author="YKMIS"
      subject={ledgerLabel}
    >
      <Page size="A4" style={pageStyle}>
        <PdfTitle
          primary={account.jwali.name}
          suffix={ledgerLabel}
          style={ledgerPdfBaseStyles.title}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        />
        <PdfLabeledValue
          label={t("common:season")}
          value={account.jwali.seasonName}
          style={ledgerPdfBaseStyles.metaRow}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        />
        <PdfLabeledValue
          label={t("common:phone_number")}
          value={account.jwali.phoneNo}
          style={ledgerPdfBaseStyles.metaRow}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        />
        <PdfLabeledValue
          label={t("common:address")}
          value={account.jwali.address}
          style={ledgerPdfBaseStyles.metaRow}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        />
        <PdfLabeledValue
          label={t("common:status")}
          value={t(`common:${account.ledger.summary.paymentStatus}`)}
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
            {t("common:jwali_ledger_summary")}
          </PdfText>
          <View style={ledgerPdfBaseStyles.summaryGrid}>
            {summaryCards.map((card) => (
              <View key={card.label} style={ledgerPdfBaseStyles.summaryCard}>
                <PdfText
                  style={ledgerPdfBaseStyles.summaryLabel}
                  documentRtl={documentRtl}
                  useArabicFont={useArabicFont}
                >
                  {card.label}
                </PdfText>
                <PdfText
                  style={ledgerPdfBaseStyles.summaryValue}
                  documentRtl={documentRtl}
                  useArabicFont={useArabicFont}
                >
                  {card.value}
                </PdfText>
              </View>
            ))}
          </View>
        </View>

        <View style={ledgerPdfBaseStyles.section}>
          <PdfText
            style={ledgerPdfBaseStyles.sectionTitle}
            documentRtl={documentRtl}
            useArabicFont={useArabicFont}
          >
            {t("common:jwali_ledger_entries")}
          </PdfText>
          {section === "payments" ? null : account.ledger.entries.length === 0 ? (
            <PdfText
              style={ledgerPdfBaseStyles.emptyState}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
            >
              {t("common:no_data")}
            </PdfText>
          ) : (
            account.ledger.entries.map((entry, index) => (
              <View key={entry.id} style={ledgerPdfBaseStyles.entryCard} wrap={false}>
                <PdfIndexedLabel
                  index={index}
                  label={t("common:jwali_entry")}
                  style={ledgerPdfBaseStyles.entryTitle}
                  documentRtl={documentRtl}
                  useArabicFont={useArabicFont}
                />
                <PdfLabeledValue
                  label={t("common:date")}
                  value={dateFormatter(entry.occurredAt)}
                  style={ledgerPdfBaseStyles.entryLine}
                  documentRtl={documentRtl}
                  useArabicFont={useArabicFont}
                />
                <PdfLabeledValue
                  label={t("common:bags_count")}
                  value={formatDisplayNumber(entry.bagCount, locale)}
                  style={ledgerPdfBaseStyles.entryLine}
                  documentRtl={documentRtl}
                  useArabicFont={useArabicFont}
                />
                <PdfLabeledValue
                  label={t("common:rate_per_bag")}
                  value={formatDisplayAmount(entry.ratePerBag, locale)}
                  style={ledgerPdfBaseStyles.entryLine}
                  documentRtl={documentRtl}
                  useArabicFont={useArabicFont}
                />
                <PdfLabeledValue
                  label={t("common:amount")}
                  value={`${formatDisplayAmount(entry.amount, locale)}${entry.currency?.code ? ` ${entry.currency.code}` : ""}`}
                  style={ledgerPdfBaseStyles.entryLine}
                  documentRtl={documentRtl}
                  useArabicFont={useArabicFont}
                />
                {entry.currency?.code ? (
                  <PdfLabeledValue
                    label={t("common:currency")}
                    value={formatCurrencyTitle(entry.currency.code, entry.currency.name, t)}
                    style={ledgerPdfBaseStyles.entryLine}
                    documentRtl={documentRtl}
                    useArabicFont={useArabicFont}
                  />
                ) : null}
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
            ))
          )}
        </View>

        <View style={ledgerPdfBaseStyles.section}>
          <PdfText
            style={ledgerPdfBaseStyles.sectionTitle}
            documentRtl={documentRtl}
            useArabicFont={useArabicFont}
          >
            {t("common:jwali_payments")}
          </PdfText>
          {section === "entries" ? null : account.ledger.payments.length === 0 ? (
            <PdfText
              style={ledgerPdfBaseStyles.emptyState}
              documentRtl={documentRtl}
              useArabicFont={useArabicFont}
            >
              {t("common:no_data")}
            </PdfText>
          ) : (
            account.ledger.payments.map((payment, index) => (
              <View key={payment.id} style={ledgerPdfBaseStyles.entryCard} wrap={false}>
                <PdfIndexedLabel
                  index={index}
                  label={t("common:jwali_payment")}
                  style={ledgerPdfBaseStyles.entryTitle}
                  documentRtl={documentRtl}
                  useArabicFont={useArabicFont}
                />
                <PdfLabeledValue
                  label={t("common:date")}
                  value={dateFormatter(payment.occurredAt)}
                  style={ledgerPdfBaseStyles.entryLine}
                  documentRtl={documentRtl}
                  useArabicFont={useArabicFont}
                />
                <PdfLabeledValue
                  label={t("common:amount")}
                  value={`${formatDisplayAmount(payment.amount, locale)}${payment.currency?.code ? ` ${payment.currency.code}` : ""}`}
                  style={ledgerPdfBaseStyles.entryLine}
                  documentRtl={documentRtl}
                  useArabicFont={useArabicFont}
                />
                {payment.currency?.code ? (
                  <PdfLabeledValue
                    label={t("common:currency")}
                    value={formatCurrencyTitle(payment.currency.code, payment.currency.name, t)}
                    style={ledgerPdfBaseStyles.entryLine}
                    documentRtl={documentRtl}
                    useArabicFont={useArabicFont}
                  />
                ) : null}
                <PdfLabeledValue
                  label={t("common:jwali_paid_via")}
                  value={formatJwaliPayment(payment, t)}
                  style={ledgerPdfBaseStyles.entryLine}
                  documentRtl={documentRtl}
                  useArabicFont={useArabicFont}
                />
                {payment.notes ? (
                  <PdfLabeledValue
                    label={t("common:notes")}
                    value={payment.notes}
                    style={ledgerPdfBaseStyles.entryLine}
                    documentRtl={documentRtl}
                    useArabicFont={useArabicFont}
                  />
                ) : null}
              </View>
            ))
          )}
        </View>
      </Page>
    </Document>
  );
};

export async function buildJwaliLedgerPdfBlob(
  account: JwaliAccount,
  summaryCards: Array<{ label: string; value: string }>,
  t: TFunction,
) {
  const documentRtl = isRTL(getTranslationLanguage(t));
  const useArabicFont = shouldUseArabicPdfFont(
    getTranslationLanguage(t),
    account.jwali.name,
    account.jwali.address,
    ...account.ledger.entries.map((entry) => entry.notes),
    ...account.ledger.payments.map((payment) => payment.notes),
  );

  const language = getTranslationLanguage(t);

  return withPdfFonts(language, () =>
    pdf(
      <JwaliLedgerPdfDocument
        account={account}
        summaryCards={summaryCards}
        t={t}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
        section="full"
      />,
    ).toBlob(),
  );
}

export async function buildJwaliLedgerEntriesPdfBlob(
  account: JwaliAccount,
  summaryCards: Array<{ label: string; value: string }>,
  t: TFunction,
) {
  const documentRtl = isRTL(getTranslationLanguage(t));
  const useArabicFont = shouldUseArabicPdfFont(
    getTranslationLanguage(t),
    account.jwali.name,
    account.jwali.address,
    ...account.ledger.entries.map((entry) => entry.notes),
  );
  const language = getTranslationLanguage(t);

  return withPdfFonts(language, () =>
    pdf(
      <JwaliLedgerPdfDocument
        account={account}
        summaryCards={summaryCards}
        t={t}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
        section="entries"
      />,
    ).toBlob(),
  );
}

export async function buildJwaliLedgerPaymentsPdfBlob(
  account: JwaliAccount,
  summaryCards: Array<{ label: string; value: string }>,
  t: TFunction,
) {
  const documentRtl = isRTL(getTranslationLanguage(t));
  const useArabicFont = shouldUseArabicPdfFont(
    getTranslationLanguage(t),
    account.jwali.name,
    account.jwali.address,
    ...account.ledger.payments.map((payment) => payment.notes),
  );
  const language = getTranslationLanguage(t);

  return withPdfFonts(language, () =>
    pdf(
      <JwaliLedgerPdfDocument
        account={account}
        summaryCards={summaryCards}
        t={t}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
        section="payments"
      />,
    ).toBlob(),
  );
}

type JwaliLedgerEntry = z.infer<typeof JwaliLedgerEntrySchema>;

export const jwaliLedgerEntryPdfFileName = (jwaliName: string, entry: JwaliLedgerEntry) => {
  const date = (entry.occurredAt || "").slice(0, 10) || "entry";
  return `${sanitizeLedgerFileName(jwaliName, `jwali-entry-${date}`)}`;
};

export const jwaliPaymentPdfFileName = (jwaliName: string, payment: JwaliPayment) => {
  const date = (payment.occurredAt || "").slice(0, 10) || "payment";
  return `${sanitizeLedgerFileName(jwaliName, `jwali-payment-${date}`)}`;
};

export async function buildJwaliLedgerEntryPdfBlob(
  account: JwaliAccount,
  summaryCards: Array<{ label: string; value: string }>,
  entry: JwaliLedgerEntry,
  t: TFunction,
) {
  const documentRtl = isRTL(getTranslationLanguage(t));
  const filtered: JwaliAccount = {
    ...account,
    ledger: {
      ...account.ledger,
      entries: [entry],
      payments: [],
    },
  };
  const useArabicFont = shouldUseArabicPdfFont(
    getTranslationLanguage(t),
    account.jwali.name,
    account.jwali.address,
    entry.notes,
  );
  const language = getTranslationLanguage(t);

  return withPdfFonts(language, () =>
    pdf(
      <JwaliLedgerPdfDocument
        account={filtered}
        summaryCards={summaryCards}
        t={t}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
        section="entries"
      />,
    ).toBlob(),
  );
}

export async function buildJwaliPaymentPdfBlob(
  account: JwaliAccount,
  summaryCards: Array<{ label: string; value: string }>,
  payment: JwaliPayment,
  t: TFunction,
) {
  const documentRtl = isRTL(getTranslationLanguage(t));
  const filtered: JwaliAccount = {
    ...account,
    ledger: {
      ...account.ledger,
      entries: [],
      payments: [payment],
    },
  };
  const useArabicFont = shouldUseArabicPdfFont(
    getTranslationLanguage(t),
    account.jwali.name,
    account.jwali.address,
    payment.notes,
  );
  const language = getTranslationLanguage(t);

  return withPdfFonts(language, () =>
    pdf(
      <JwaliLedgerPdfDocument
        account={filtered}
        summaryCards={summaryCards}
        t={t}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
        section="payments"
      />,
    ).toBlob(),
  );
}
