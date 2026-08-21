import { zodResolver } from "@hookform/resolvers/zod";
import { Document, Page, StyleSheet, View, pdf } from "@react-pdf/renderer";
import { useEffect, useMemo, useState } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Pencil, PlusIcon, Printer, Share2, Trash2 } from "lucide-react";
import DatePickerField from "@/components/Fields/DatePickerField";
import ShamsiMonthPickerField from "@/components/Fields/ShamsiMonthPickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import CustomDialog from "@/components/CustomDialog";
import { LedgerPdfRowActions } from "@/components/LedgerPdfRowActions";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatCurrencyLabel } from "@/utils/currencyDisplay";
import {
  formatDisplayAmount,
  formatDisplayNumber,
  getDisplayLocale,
} from "@/utils/displayLocale";
import {
  currentShamsiMonthKey,
  currentShamsiMonthStart,
  formatShamsiMonthLabel,
  formatShamsiMonthLabelFromKey,
} from "@/utils/shamsiCalendar";
import { getErrorMessage } from "@/utils/getErrorMessage";
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
import { openPdfPrintPreview, runLedgerPdfAction } from "@/utils/ledgerPdf";
import { saveBlob } from "@/utils/saveBlob";
import { toast } from "sonner";
import { useCurrencies } from "../../currencies/hooks/useCurrencies";
import { useSarafs } from "../../sarafi/hooks/useSarafs";
import { useAddSalaryPayment } from "../hooks/useAddSalaryPayment";
import { useAddSalaryDeduction } from "../hooks/useAddSalaryDeduction";
import { useAddCreditRepayment } from "../hooks/useAddCreditRepayment";
import { useDeleteSalaryLedgerEntry } from "../hooks/useDeleteSalaryLedgerEntry";
import { useEmployeeAccount } from "../hooks/useEmployeeAccount";
import { useSalaryMonthPreview } from "../hooks/useSalaryMonthPreview";
import { useUpdateSalaryLedgerEntry } from "../hooks/useUpdateSalaryLedgerEntry";
import {
  EMPLOYEE_SALARY_PAYMENT_ROUTE,
  createCreditRepaymentFormSchema,
  createSalaryDeductionFormSchema,
  createSalaryLedgerFormSchema,
  createSalaryPaymentFormSchema,
  type CreditRepaymentFormValues,
  type EmployeeAccount,
  type EmployeeLedgerEntry,
  type SalaryLedgerFormValues,
} from "../schemas/employee";
import {
  buildEmployeeLedgerEntryPdfBlob,
  employeeLedgerEntryPdfFileName,
  getEmployeeLedgerEntryLabel,
} from "../utils/employeeLedgerEntryPdf";

const today = new Date().toISOString().slice(0, 10);
const defaultSalaryMonth = currentShamsiMonthStart();

const employeeLedgerPdfStyles = StyleSheet.create({
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

const sanitizeEmployeeLedgerFileName = (name: string) =>
  `${name.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase() || "employee"}-salary-ledger.pdf`;

type EmployeeSalaryLedgerPdfEntry = {
  id: string;
  typeLabel: string;
  salaryMonth: string;
  occurredAt: string;
  amount: string;
  advanceLabel: string;
  paymentLabel: string;
  notes: string | null;
};

const formatSalaryEntryPayment = (
  entry: EmployeeLedgerEntry,
  t: (key: string) => string,
) => {
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
};

type EmployeeSalaryLedgerPdfLabels = {
  salaryLedger: string;
  employee: string;
  position: string;
  employeeNo: string;
  season: string;
  phone: string;
  address: string;
  hireDate: string;
  salaryMonth: string;
  date: string;
  amount: string;
  advance: string;
  payment: string;
  notes: string;
  sectionSummary: string;
  sectionEntries: string;
};

const EmployeeSalaryLedgerPdfDocument = ({
  account,
  summaryCards,
  entries,
  labels,
  documentRtl,
  useArabicFont,
}: {
  account: EmployeeAccount;
  summaryCards: Array<{ label: string; value: string }>;
  entries: EmployeeSalaryLedgerPdfEntry[];
  labels: EmployeeSalaryLedgerPdfLabels;
  documentRtl: boolean;
  useArabicFont: boolean;
}) => {
  const documentTitle = `${account.employee.name} — ${labels.salaryLedger}`;
  const pageStyle = getPdfPageStyle({
    baseStyle: employeeLedgerPdfStyles.page,
    documentRtl,
    useArabicFont,
  });

  return (
  <Document title={documentTitle} author="YKMIS" subject={documentTitle}>
    <Page size="A4" style={pageStyle}>
      <PdfTitle
        primary={account.employee.name}
        suffix={labels.salaryLedger}
        style={employeeLedgerPdfStyles.title}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
      />
      <PdfLabeledValue
        label={labels.employee}
        value={account.employee.name}
        style={employeeLedgerPdfStyles.metaRow}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
      />
      <PdfLabeledValue
        label={labels.position}
        value={account.employee.position}
        style={employeeLedgerPdfStyles.metaRow}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
      />
      <PdfLabeledValue
        label={labels.employeeNo}
        value={account.employee.employeeNo}
        style={employeeLedgerPdfStyles.metaRow}
        documentRtl={documentRtl}
      />
      <PdfLabeledValue
        label={labels.season}
        value={account.employee.seasonName}
        style={employeeLedgerPdfStyles.metaRow}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
      />
      <PdfLabeledValue
        label={labels.phone}
        value={account.employee.phoneNo}
        style={employeeLedgerPdfStyles.metaRow}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
      />
      <PdfLabeledValue
        label={labels.address}
        value={account.employee.address}
        style={employeeLedgerPdfStyles.metaRow}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
      />
      <PdfLabeledValue
        label={labels.hireDate}
        value={dateFormatter(account.employee.joinDate)}
        style={employeeLedgerPdfStyles.metaRow}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
      />

      <View style={employeeLedgerPdfStyles.section}>
        <PdfText
          style={employeeLedgerPdfStyles.sectionTitle}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        >
          {labels.sectionSummary}
        </PdfText>
        <View style={employeeLedgerPdfStyles.summaryGrid}>
          {summaryCards.map((card) => (
            <View key={card.label} style={employeeLedgerPdfStyles.summaryCard}>
              <PdfText
                style={employeeLedgerPdfStyles.summaryLabel}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
              >
                {card.label}
              </PdfText>
              <PdfText
                style={employeeLedgerPdfStyles.summaryValue}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
              >
                {card.value}
              </PdfText>
            </View>
          ))}
        </View>
      </View>

      <View style={employeeLedgerPdfStyles.section}>
        <PdfText
          style={employeeLedgerPdfStyles.sectionTitle}
          documentRtl={documentRtl}
          useArabicFont={useArabicFont}
        >
          {labels.sectionEntries}
        </PdfText>
        {entries.length === 0 ? (
          <PdfText
            style={employeeLedgerPdfStyles.emptyState}
            documentRtl={documentRtl}
            useArabicFont={useArabicFont}
          >
            —
          </PdfText>
        ) : (
          entries.map((entry, index) => (
            <View key={entry.id} style={employeeLedgerPdfStyles.entryCard} wrap={false}>
              <PdfIndexedLabel
                index={index}
                label={entry.typeLabel}
                style={employeeLedgerPdfStyles.entryTitle}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
              />
              <PdfLabeledValue
                label={labels.salaryMonth}
                value={entry.salaryMonth}
                style={employeeLedgerPdfStyles.entryLine}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
              />
              <PdfLabeledValue
                label={labels.date}
                value={entry.occurredAt}
                style={employeeLedgerPdfStyles.entryLine}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
              />
              <PdfLabeledValue
                label={labels.amount}
                value={entry.amount}
                style={employeeLedgerPdfStyles.entryLine}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
              />
              <PdfLabeledValue
                label={labels.advance}
                value={entry.advanceLabel}
                style={employeeLedgerPdfStyles.entryLine}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
              />
              <PdfLabeledValue
                label={labels.payment}
                value={entry.paymentLabel}
                style={employeeLedgerPdfStyles.entryLine}
                documentRtl={documentRtl}
                useArabicFont={useArabicFont}
              />
              {entry.notes ? (
                <PdfLabeledValue
                  label={labels.notes}
                  value={entry.notes}
                  style={employeeLedgerPdfStyles.entryLine}
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

const buildEmployeeSalaryLedgerPdfBlob = async (
  account: EmployeeAccount,
  summaryCards: Array<{ label: string; value: string }>,
  entries: EmployeeSalaryLedgerPdfEntry[],
  labels: EmployeeSalaryLedgerPdfLabels,
  documentRtl: boolean,
  useArabicFont: boolean,
  language: string,
) =>
  withPdfFonts(language, () =>
    pdf(
      <EmployeeSalaryLedgerPdfDocument
        account={account}
        summaryCards={summaryCards}
        entries={entries}
        labels={labels}
        documentRtl={documentRtl}
        useArabicFont={useArabicFont}
      />,
    ).toBlob(),
  );

const openEmployeePdfPrintPreview = (blob: Blob, t: ReturnType<typeof useTranslation>["t"]) => {
  openPdfPrintPreview(blob, t);
};

export function EmployeeAccountPage() {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const { id } = useParams();
  const [salaryDialogMode, setSalaryDialogMode] = useState<
    "payment" | "deduction" | "credit_repayment" | null
  >(null);
  const [editingEntry, setEditingEntry] = useState<EmployeeLedgerEntry | null>(null);
  const [activePdfAction, setActivePdfAction] = useState<"download" | "share" | "print" | null>(null);
  const [activeRowPdfKey, setActiveRowPdfKey] = useState<string | null>(null);
  const { data, isLoading, error } = useEmployeeAccount(id);
  const { mutate: addSalaryPayment, isPending: isAddingSalaryPayment } = useAddSalaryPayment(id);
  const { mutate: addSalaryDeduction, isPending: isAddingSalaryDeduction } = useAddSalaryDeduction(id);
  const { mutate: addCreditRepayment, isPending: isAddingCreditRepayment } =
    useAddCreditRepayment(id);
  const { mutate: updateSalaryLedgerEntry, isPending: isUpdatingSalaryLedgerEntry } =
    useUpdateSalaryLedgerEntry(id);
  const { mutate: deleteSalaryLedgerEntry, isPending: isDeletingSalaryLedgerEntry } =
    useDeleteSalaryLedgerEntry(id);

  const salaryLedgerFormSchema = useMemo(() => createSalaryLedgerFormSchema(t), [t]);
  const salaryDeductionFormSchema = useMemo(() => createSalaryDeductionFormSchema(t), [t]);
  const salaryPaymentFormSchema = useMemo(() => createSalaryPaymentFormSchema(t), [t]);
  const creditRepaymentFormSchema = useMemo(() => createCreditRepaymentFormSchema(t), [t]);

  const seasonId = data?.employee.seasonId;

  const { data: sarafsData } = useSarafs({
    pageNumber: 1,
    pageSize: 500,
    seasonId,
    sortBy: "name",
    sortDirection: "asc",
  });

  const { data: currenciesData, isLoading: currenciesLoading } = useCurrencies({
    pageNumber: 1,
    pageSize: 200,
    isActive: "true",
    sortBy: "code",
    sortDirection: "asc",
  });

  const paymentRouteOptions = useMemo(
    () =>
      EMPLOYEE_SALARY_PAYMENT_ROUTE.map((route) => ({
        value: route,
        label:
          route === "cash"
            ? t("common:pay_in_cash")
            : salaryDialogMode === "credit_repayment"
              ? t("common:pay_to_saraf")
              : t("common:jwali_paid_by_saraf"),
      })),
    [salaryDialogMode, t],
  );

  const sarafOptions = useMemo(
    () =>
      (sarafsData?.items ?? []).map((s) => ({
        value: s.id,
        label: `${s.name} — ${s.phoneNo}`,
      })),
    [sarafsData?.items],
  );

  const currencyOptions = useMemo(
    () =>
      (currenciesData?.items ?? []).map((c) => ({
        value: c.id,
        label: formatCurrencyLabel(c.code, c.name, t),
      })),
    [currenciesData?.items, t],
  );

  const salaryForm = useForm<SalaryLedgerFormValues>({
    resolver: zodResolver(salaryLedgerFormSchema) as Resolver<SalaryLedgerFormValues>,
    defaultValues: {
      monthlySalaryPreview: "",
      amount: "",
      paymentDate: today,
      salaryMonth: defaultSalaryMonth,
      paymentChannel: "cash",
      sarafId: "",
      sarafLedgerCurrencyId: "",
      notes: "",
    },
  });

  const creditRepaymentForm = useForm<CreditRepaymentFormValues>({
    resolver: zodResolver(creditRepaymentFormSchema) as Resolver<CreditRepaymentFormValues>,
    defaultValues: {
      creditBalancePreview: "",
      amount: "",
      paymentDate: today,
      paymentChannel: "cash",
      sarafId: "",
      sarafLedgerCurrencyId: "",
      notes: "",
    },
  });

  const paymentChannel = useWatch({ control: salaryForm.control, name: "paymentChannel" }) || "cash";
  const creditPaymentChannel =
    useWatch({ control: creditRepaymentForm.control, name: "paymentChannel" }) || "cash";
  const selectedSalaryMonth =
    useWatch({ control: salaryForm.control, name: "salaryMonth" }) || defaultSalaryMonth;
  const { data: salaryMonthPreview, isLoading: salaryMonthPreviewLoading } = useSalaryMonthPreview(
    id,
    salaryDialogMode === "payment" || salaryDialogMode === "deduction"
      ? selectedSalaryMonth
      : undefined,
  );

  useEffect(() => {
    if (!data) {
      return;
    }

    salaryForm.setValue(
      "monthlySalaryPreview",
      formatDisplayAmount(data.employee.monthlySalary, locale),
    );
  }, [data, locale, salaryForm]);

  useEffect(() => {
    if (paymentChannel === "cash") {
      salaryForm.setValue("sarafId", "");
    }
  }, [paymentChannel, salaryForm]);

  useEffect(() => {
    if (creditPaymentChannel === "cash") {
      creditRepaymentForm.setValue("sarafId", "");
    }
  }, [creditPaymentChannel, creditRepaymentForm]);

  useEffect(() => {
    const items = currenciesData?.items ?? [];
    if (
      !items.length ||
      (salaryDialogMode !== "payment" && salaryDialogMode !== "credit_repayment")
    ) {
      return;
    }
    const preferred = items.find((c) => c.code === "USD") ?? items[0];
    if (salaryDialogMode === "payment") {
      const current = salaryForm.getValues("sarafLedgerCurrencyId");
      if (!current && preferred) {
        salaryForm.setValue("sarafLedgerCurrencyId", preferred.id);
      }
      return;
    }
    const current = creditRepaymentForm.getValues("sarafLedgerCurrencyId");
    if (!current && preferred) {
      creditRepaymentForm.setValue("sarafLedgerCurrencyId", preferred.id);
    }
  }, [currenciesData?.items, salaryDialogMode, salaryForm, creditRepaymentForm]);

  const closeSalaryDialog = () => {
    setSalaryDialogMode(null);
    setEditingEntry(null);
  };

  const resetSalaryForm = () => {
    if (!data) {
      return;
    }

    salaryForm.reset({
      monthlySalaryPreview: formatDisplayAmount(data.employee.monthlySalary, locale),
      amount: "",
      paymentDate: today,
      salaryMonth: defaultSalaryMonth,
      paymentChannel: "cash",
      sarafId: "",
      sarafLedgerCurrencyId: "",
      notes: "",
    });
  };

  const resetCreditRepaymentForm = (creditBalance?: string) => {
    if (!data) {
      return;
    }

    const balance = creditBalance ?? data.ledger.summary.employeeCreditBalance;
    creditRepaymentForm.reset({
      creditBalancePreview: formatDisplayAmount(balance, locale),
      amount: Number(balance) > 0 ? balance : "",
      paymentDate: today,
      paymentChannel: "cash",
      sarafId: "",
      sarafLedgerCurrencyId: "",
      notes: "",
    });
  };

  const openCreditRepaymentDialog = () => {
    resetCreditRepaymentForm();
    setEditingEntry(null);
    setSalaryDialogMode("credit_repayment");
  };

  const openEntryForEdit = (entry: EmployeeLedgerEntry) => {
    setEditingEntry(entry);
    if (entry.entryType === "credit_repayment") {
      setSalaryDialogMode("credit_repayment");
      creditRepaymentForm.reset({
        creditBalancePreview: formatDisplayAmount(
          data?.ledger.summary.employeeCreditBalance ?? "0",
          locale,
        ),
        amount: entry.amount,
        paymentDate: entry.occurredAt.slice(0, 10),
        paymentChannel: entry.paymentChannel ?? "cash",
        sarafId: entry.sarafId ?? "",
        sarafLedgerCurrencyId: entry.sarafLedgerCurrencyId ?? "",
        notes: entry.notes ?? "",
      });
      return;
    }

    setSalaryDialogMode(entry.entryType === "salary_deduction" ? "deduction" : "payment");
    salaryForm.reset({
      monthlySalaryPreview: formatDisplayAmount(data?.employee.monthlySalary ?? "0", locale),
      amount: entry.amount,
      paymentDate: entry.occurredAt.slice(0, 10),
      salaryMonth: entry.salaryMonth.slice(0, 10),
      paymentChannel: entry.paymentChannel ?? "cash",
      sarafId: entry.sarafId ?? "",
      sarafLedgerCurrencyId: entry.sarafLedgerCurrencyId ?? "",
      notes: entry.notes ?? "",
    });
  };

  const handleDeleteEntry = (entry: EmployeeLedgerEntry) => {
    if (!confirm(t("common:employee_ledger_entry_delete_confirm"))) {
      return;
    }

    deleteSalaryLedgerEntry(entry.id);
  };

  const isSavingSalaryEntry =
    isAddingSalaryPayment ||
    isAddingSalaryDeduction ||
    isAddingCreditRepayment ||
    isUpdatingSalaryLedgerEntry;

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("common:salary_account") })}
      />
    );
  }

  if (error || !data) {
    return <StatusIndicator statusType="error" message={t("common:error_message")} />;
  }

  const canEdit = data.employee.season?.status === "ACTIVE";
  const employeeCreditBalance = Number(data.ledger.summary.employeeCreditBalance);
  const hasEmployeeCredit = employeeCreditBalance > 0;
  const currentShamsiMonthLabel =
    data.ledger.summary.currentShamsiMonthLabel ??
    formatShamsiMonthLabelFromKey(
      data.ledger.summary.currentShamsiMonthKey ?? currentShamsiMonthKey(),
    );
  const grossPayableThisMonth =
    data.ledger.summary.grossPayableThisMonth ?? data.ledger.summary.payableThisMonth;

  const totalPayableFromHire =
    data.ledger.summary.totalPayableFromHire ?? data.ledger.summary.payableThisMonth;
  const remainingFromHire =
    data.ledger.summary.remainingFromHire ?? data.ledger.summary.payableThisMonth;
  const deductionsFromHire =
    data.ledger.summary.deductionsFromHire ?? data.ledger.summary.deductionsThisMonth;
  const paidFromHire =
    data.ledger.summary.paidFromHire ?? data.ledger.summary.paidThisMonth;

  const summaryCards = [
    {
      label: t("common:monthly_salary"),
      value: formatDisplayAmount(data.ledger.summary.currentMonthlySalary, locale),
    },
    {
      label: t("common:total_salary_from_hire"),
      value: formatDisplayAmount(totalPayableFromHire, locale),
    },
    {
      label: t("common:remaining_salary_from_hire"),
      value: formatDisplayAmount(remainingFromHire, locale),
    },
    {
      label: t("common:paid_salary_from_hire"),
      value: formatDisplayAmount(paidFromHire, locale),
    },
    {
      label: t("common:deductions_from_hire"),
      value: formatDisplayAmount(deductionsFromHire, locale),
    },
    {
      label: `${t("common:payable_this_month")} (${currentShamsiMonthLabel})`,
      value: formatDisplayAmount(data.ledger.summary.payableThisMonth, locale),
    },
    {
      label: t("common:payable_for_month"),
      value: formatDisplayAmount(grossPayableThisMonth, locale),
    },
    {
      label: t("common:total_salary_paid"),
      value: formatDisplayAmount(data.ledger.summary.totalPaidAmount, locale),
    },
    {
      label: t("common:deductions_this_month"),
      value: formatDisplayAmount(data.ledger.summary.deductionsThisMonth, locale),
    },
    {
      label: t("common:paid_this_month"),
      value: formatDisplayAmount(data.ledger.summary.paidThisMonth, locale),
    },
    {
      label: t("common:employee_we_owe_this_month"),
      value: formatDisplayAmount(data.ledger.summary.weOweEmployeeThisMonth, locale),
    },
    {
      label: t("common:employee_credit_balance"),
      value: formatDisplayAmount(data.ledger.summary.employeeCreditBalance, locale),
    },
    {
      label: t("common:payment_count"),
      value: formatDisplayNumber(data.ledger.summary.paymentCount, locale),
    },
  ];

  const ledgerFileName = sanitizeEmployeeLedgerFileName(data.employee.name);

  const handleEntryPdfAction = async (
    entry: EmployeeLedgerEntry,
    action: "download" | "share" | "print",
  ) => {
    const rowKey = entry.id;
    setActiveRowPdfKey(`${rowKey}-${action}`);
    const fileName = employeeLedgerEntryPdfFileName(data.employee.name, entry);
    const shareTitle = t("common:employee_ledger_entry_pdf_title", {
      name: data.employee.name,
      entry: getEmployeeLedgerEntryLabel(entry, t),
    });

    await runLedgerPdfAction(
      action,
      () => buildEmployeeLedgerEntryPdfBlob(data, entry, t),
      fileName,
      shareTitle,
      t,
      (error) => toast.error(getErrorMessage(error, t)),
    );
    setActiveRowPdfKey(null);
  };

  const pdfLabels: EmployeeSalaryLedgerPdfLabels = {
    salaryLedger: t("common:salary_account"),
    employee: t("common:employee"),
    position: t("common:position"),
    employeeNo: t("common:employee_no"),
    season: t("common:season"),
    phone: t("common:phone_number"),
    address: t("common:address"),
    hireDate: t("common:hire_date"),
    salaryMonth: t("common:salary_month"),
    date: t("common:date"),
    amount: t("common:amount"),
    advance: t("common:salary_advance"),
    payment: t("common:payment"),
    notes: t("common:notes"),
    sectionSummary: t("common:employee_ledger_summary"),
    sectionEntries: t("common:ledger_entries"),
  };

  const pdfDocumentTitle = `${data.employee.name} — ${pdfLabels.salaryLedger}`;

  const pdfEntries: EmployeeSalaryLedgerPdfEntry[] = data.ledger.entries.map((entry) => ({
    id: entry.id,
    typeLabel: t(`common:${entry.entryType}`),
    salaryMonth:
      entry.entryType === "credit_repayment" ? "—" : formatShamsiMonthLabel(entry.salaryMonth),
    occurredAt: dateFormatter(entry.occurredAt),
    amount: formatDisplayAmount(entry.amount, locale),
    advanceLabel:
      entry.entryType === "salary_payment" && entry.isAdvance ? t("common:salary_advance") : "—",
    paymentLabel: formatSalaryEntryPayment(entry, t),
    notes: entry.notes ?? null,
  }));

  const withEmployeeSalaryLedgerPdf = async <T,>(
    action: "download" | "share" | "print",
    callback: (blob: Blob) => Promise<T> | T,
  ) => {
    setActivePdfAction(action);

    try {
      const documentRtl = isRTL(i18n.language);
      const useArabicFont = shouldUseArabicPdfFont(
        i18n.language,
        data.employee.name,
        data.employee.position,
        data.employee.address,
        ...pdfEntries.map((entry) => entry.notes),
      );
      const blob = await buildEmployeeSalaryLedgerPdfBlob(
        data,
        summaryCards,
        pdfEntries,
        pdfLabels,
        documentRtl,
        useArabicFont,
        getTranslationLanguage(t),
      );
      return await callback(blob);
    } catch (err) {
      toast.error(getErrorMessage(err, t));
      return undefined;
    } finally {
      setActivePdfAction(null);
    }
  };

  const handlePrint = async () => {
    await withEmployeeSalaryLedgerPdf("print", async (blob) => {
      openEmployeePdfPrintPreview(blob, t);
    });
  };

  const handleDownload = async () => {
    await withEmployeeSalaryLedgerPdf("download", async (blob) => {
      saveBlob(blob, ledgerFileName);
      toast.success(t("common:salary_ledger_downloaded"));
    });
  };

  const handleShare = async () => {
    await withEmployeeSalaryLedgerPdf("share", async (blob) => {
      const pdfFile = new File([blob], ledgerFileName, { type: "application/pdf" });

      if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({
          title: pdfDocumentTitle,
          files: [pdfFile],
        });
        return;
      }

      saveBlob(blob, ledgerFileName);
      toast.info(t("common:salary_ledger_share_fallback"));
    });
  };

  return (
    <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <div className="flex w-full min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Button asChild variant="ghost" className="px-0">
              <Link to="/yk/employees">
                <ArrowLeft className="me-2 h-4 w-4" />
                {t("common:back_to_employees")}
              </Link>
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold">{data.employee.name}</h2>
                <Badge
                  variant={
                    data.ledger.summary.paymentStatus === "paid" ? "default" : "secondary"
                  }
                >
                  {t(`common:${data.ledger.summary.paymentStatus}`)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {data.employee.position} {" - "} {data.employee.employeeNo}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" onClick={handlePrint} disabled={activePdfAction !== null}>
              <Printer className="me-2 h-4 w-4" />
              {activePdfAction === "print" ? t("common:preparing_pdf") : t("common:print")}
            </Button>
            <Button variant="outline" onClick={handleShare} disabled={activePdfAction !== null}>
              <Share2 className="me-2 h-4 w-4" />
              {activePdfAction === "share" ? t("common:preparing_pdf") : t("common:report_share")}
            </Button>
            <Button variant="outline" onClick={handleDownload} disabled={activePdfAction !== null}>
              <Download className="me-2 h-4 w-4" />
              {activePdfAction === "download" ? t("common:preparing_pdf") : t("common:download")}
            </Button>
            {canEdit ? (
              <>
                <Button onClick={() => setSalaryDialogMode("payment")}>
                  <PlusIcon className="me-2 h-4 w-4" />
                  {t("common:add_salary_payment")}
                </Button>
                <Button variant="outline" onClick={() => setSalaryDialogMode("deduction")}>
                  <PlusIcon className="me-2 h-4 w-4" />
                  {t("common:add_salary_deduction")}
                </Button>
                {hasEmployeeCredit ? (
                  <Button variant="secondary" onClick={openCreditRepaymentDialog}>
                    <PlusIcon className="me-2 h-4 w-4" />
                    {t("common:add_employee_credit_repayment")}
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:position")}</CardDescription>
              <CardTitle>{data.employee.position}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:phone_number")}</CardDescription>
              <CardTitle>{data.employee.phoneNo}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:hire_date")}</CardDescription>
              <CardTitle>{dateFormatter(data.employee.joinDate)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:salary_status")}</CardDescription>
              <CardTitle>{t(`common:${data.ledger.summary.paymentStatus}`)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:monthly_salary")}</CardDescription>
              <CardTitle className="tabular-nums">
                {formatDisplayAmount(data.employee.monthlySalary, locale)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="md:col-span-2 xl:col-span-3">
            <CardHeader className="pb-2">
              <CardDescription>{t("common:address")}</CardDescription>
              <CardTitle>{data.employee.address}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <p>{t("common:employee_salary_balance_description")}</p>
          <p className="mt-2 font-medium text-foreground">
            {t("common:shamsi_salary_month")}: {currentShamsiMonthLabel}
          </p>
          <p className="mt-1 text-foreground">
            {t("common:salary_from_hire_hint")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="tabular-nums">{card.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("common:salary_ledger_entries")}</CardTitle>
            <CardDescription>{t("common:salary_ledger_entries_description")}</CardDescription>
          </CardHeader>
          <div className="p-0">
            {data.ledger.entries.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                {t("common:no_data")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>{t("common:type")}</TableHead>
                      <TableHead>{t("common:salary_month")}</TableHead>
                      <TableHead>{t("common:date")}</TableHead>
                      <TableHead className="text-end">{t("common:amount")}</TableHead>
                      <TableHead>{t("common:payment")}</TableHead>
                      <TableHead>{t("common:salary_advance")}</TableHead>
                      <TableHead>{t("common:notes")}</TableHead>
                      <TableHead className="text-end">{t("common:actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.ledger.entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{t(`common:${entry.entryType}`)}</TableCell>
                        <TableCell>
                          {entry.entryType === "credit_repayment"
                            ? "—"
                            : formatShamsiMonthLabel(entry.salaryMonth)}
                        </TableCell>
                        <TableCell>{dateFormatter(entry.occurredAt)}</TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatDisplayAmount(entry.amount, locale)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatSalaryEntryPayment(entry, t)}
                        </TableCell>
                        <TableCell>
                          {entry.entryType === "salary_payment" && entry.isAdvance ? (
                            <Badge variant="outline">{t("common:salary_advance")}</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{entry.notes || "—"}</TableCell>
                        <TableCell className="text-end">
                          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
                            {canEdit ? (
                              <>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  disabled={isSavingSalaryEntry || isDeletingSalaryLedgerEntry}
                                  onClick={() => openEntryForEdit(entry)}
                                  aria-label={t("common:employee_ledger_entry_edit")}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  disabled={isSavingSalaryEntry || isDeletingSalaryLedgerEntry}
                                  onClick={() => handleDeleteEntry(entry)}
                                  aria-label={t("common:employee_ledger_entry_delete")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : null}
                            <LedgerPdfRowActions
                              rowKey={entry.id}
                              activeKey={activeRowPdfKey}
                              onPrint={() => handleEntryPdfAction(entry, "print")}
                              onShare={() => handleEntryPdfAction(entry, "share")}
                              onDownload={() => handleEntryPdfAction(entry, "download")}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>
      </div>

      <CustomDialog
        open={salaryDialogMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeSalaryDialog();
          }
        }}
        title={
          editingEntry
            ? t("common:employee_ledger_entry_edit_title")
            : salaryDialogMode === "deduction"
              ? t("common:add_salary_deduction")
              : salaryDialogMode === "credit_repayment"
                ? t("common:add_employee_credit_repayment")
                : t("common:add_salary_payment")
        }
        description={
          editingEntry
            ? t("common:employee_ledger_entry_edit_description")
            : salaryDialogMode === "deduction"
              ? t("common:add_salary_deduction_description")
              : salaryDialogMode === "credit_repayment"
                ? t("common:add_employee_credit_repayment_description")
                : t("common:add_salary_payment_description")
        }
        contentClassName="min-w-3xl"
      >
        {salaryDialogMode === "credit_repayment" ? (
          <Form {...creditRepaymentForm}>
            <form
              onSubmit={creditRepaymentForm.handleSubmit((values) => {
                const onSuccess = () => {
                  resetCreditRepaymentForm();
                  closeSalaryDialog();
                };
                const parsed = creditRepaymentFormSchema.parse(values);

                if (editingEntry) {
                  updateSalaryLedgerEntry(
                    {
                      entryId: editingEntry.id,
                      values: parsed,
                    },
                    { onSuccess },
                  );
                  return;
                }

                addCreditRepayment(parsed, { onSuccess });
              })}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  name="creditBalancePreview"
                  label={t("common:employee_credit_balance")}
                  control={creditRepaymentForm.control}
                  disabled
                  characterRestriction="none"
                />
                <InputField
                  name="amount"
                  label={t("common:amount")}
                  control={creditRepaymentForm.control}
                  required
                  type="number"
                  characterRestriction="none"
                />
                <DatePickerField
                  name="paymentDate"
                  label={t("common:date")}
                  control={creditRepaymentForm.control}
                  required
                />
                <div className="md:col-span-2 space-y-2 rounded-lg border bg-muted/20 p-4">
                  <DynamicLocalSelect
                    name="paymentChannel"
                    label={t("common:jwali_payment_mode")}
                    control={creditRepaymentForm.control}
                    required
                    options={paymentRouteOptions}
                    placeholder={t("common:select", { name: t("common:jwali_payment_mode") })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {creditPaymentChannel === "saraf"
                      ? t("common:employee_credit_repayment_route_saraf_hint")
                      : t("common:employee_credit_repayment_route_cash_hint")}
                  </p>
                </div>
                <DynamicLocalSelect
                  name="sarafLedgerCurrencyId"
                  label={t("common:currency")}
                  control={creditRepaymentForm.control}
                  required
                  options={currencyOptions}
                  disabled={currenciesLoading || currencyOptions.length === 0}
                  placeholder={t("common:select", { name: t("common:currency") })}
                />
                {creditPaymentChannel === "saraf" ? (
                  <DynamicLocalSelect
                    name="sarafId"
                    label={t("common:rice_sale_saraf_for_ledger")}
                    control={creditRepaymentForm.control}
                    required
                    options={sarafOptions}
                    disabled={!seasonId || sarafOptions.length === 0}
                    placeholder={t("common:select", {
                      name: t("common:rice_sale_saraf_for_ledger"),
                    })}
                  />
                ) : null}
                <InputField
                  name="notes"
                  label={t("common:notes")}
                  control={creditRepaymentForm.control}
                  characterRestriction="none"
                  className="md:col-span-2"
                />
              </div>

              <Button type="submit" disabled={isSavingSalaryEntry}>
                {isSavingSalaryEntry
                  ? t("common:saving", { name: t("common:credit_repayment") })
                  : editingEntry
                    ? t("common:employee_ledger_entry_save")
                    : t("common:save", { name: t("common:credit_repayment") })}
              </Button>
            </form>
          </Form>
        ) : (
        <Form {...salaryForm}>
          <form
            onSubmit={salaryForm.handleSubmit((values) => {
              const onSuccess = () => {
                resetSalaryForm();
                closeSalaryDialog();
              };

              if (editingEntry) {
                if (salaryDialogMode === "deduction") {
                  updateSalaryLedgerEntry(
                    {
                      entryId: editingEntry.id,
                      values: salaryDeductionFormSchema.parse(values),
                    },
                    { onSuccess },
                  );
                  return;
                }

                updateSalaryLedgerEntry(
                  {
                    entryId: editingEntry.id,
                    values: salaryPaymentFormSchema.parse(values),
                  },
                  { onSuccess },
                );
                return;
              }

              if (salaryDialogMode === "deduction") {
                addSalaryDeduction(salaryDeductionFormSchema.parse(values), { onSuccess });
                return;
              }

              addSalaryPayment(salaryPaymentFormSchema.parse(values), { onSuccess });
            })}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                name="monthlySalaryPreview"
                label={t("common:monthly_salary")}
                control={salaryForm.control}
                disabled
                characterRestriction="none"
              />
              <InputField
                name="amount"
                label={t("common:amount")}
                control={salaryForm.control}
                required
                type="number"
                characterRestriction="none"
              />
              <DatePickerField
                name="paymentDate"
                label={t("common:date")}
                control={salaryForm.control}
                required
              />
              <ShamsiMonthPickerField
                name="salaryMonth"
                label={t("common:shamsi_salary_month")}
                control={salaryForm.control}
                required
              />
              {salaryMonthPreview ? (
                <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">
                      {salaryMonthPreview.shamsiMonthLabel}
                    </p>
                    {salaryMonthPreview.isFutureMonth ? (
                      <Badge variant="secondary">{t("common:salary_future_month")}</Badge>
                    ) : null}
                    {salaryMonthPreview.isPrepaid ? (
                      <Badge variant="default">{t("common:salary_prepaid")}</Badge>
                    ) : null}
                    {salaryMonthPreview.isHireMonth ? (
                      <Badge variant="outline">{t("common:salary_hire_month_prorate")}</Badge>
                    ) : salaryMonthPreview.isPartialMonth ? (
                      <Badge variant="outline">{t("common:salary_partial_month_prorate")}</Badge>
                    ) : null}
                  </div>
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <p>
                      {t("common:payable_for_month")}:{" "}
                      <span className="font-medium tabular-nums">
                        {formatDisplayAmount(salaryMonthPreview.payableAmount, locale)}
                      </span>
                    </p>
                    <p>
                      {t("common:paid_this_month")}:{" "}
                      <span className="font-medium tabular-nums">
                        {formatDisplayAmount(salaryMonthPreview.paidAmount, locale)}
                      </span>
                    </p>
                    <p>
                      {t("common:deductions_this_month")}:{" "}
                      <span className="font-medium tabular-nums">
                        {formatDisplayAmount(salaryMonthPreview.deductionsAmount, locale)}
                      </span>
                    </p>
                    <p>
                      {t("common:salary_amount_remaining")}:{" "}
                      <span className="font-medium tabular-nums">
                        {formatDisplayAmount(salaryMonthPreview.remainingAmount, locale)}
                      </span>
                    </p>
                  </div>
                  {salaryMonthPreview.isHireMonth || salaryMonthPreview.isPartialMonth ? (
                    <p className="text-xs text-muted-foreground">
                      {t("common:salary_prorate_hint", {
                        days: salaryMonthPreview.payableDays,
                        totalDays: salaryMonthPreview.daysInMonth,
                      })}
                    </p>
                  ) : null}
                  {salaryMonthPreview.isPrepaid ? (
                    <p className="text-xs text-muted-foreground">
                      {t("common:salary_prepaid_hint")}
                    </p>
                  ) : null}
                  {salaryDialogMode === "payment" &&
                  Number(salaryMonthPreview.remainingAmount) > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={salaryMonthPreviewLoading}
                      onClick={() => {
                        salaryForm.setValue(
                          "amount",
                          salaryMonthPreview.remainingAmount,
                          { shouldValidate: true },
                        );
                      }}
                    >
                      {t("common:pay_full_remaining_salary")}
                    </Button>
                  ) : null}
                </div>
              ) : salaryMonthPreviewLoading ? (
                <p className="md:col-span-2 text-sm text-muted-foreground">
                  {t("common:loading", { name: t("common:salary_month_preview") })}
                </p>
              ) : null}
              {salaryDialogMode === "payment" ? (
                <>
                  <div className="md:col-span-2 space-y-2 rounded-lg border bg-muted/20 p-4">
                    <DynamicLocalSelect
                      name="paymentChannel"
                      label={t("common:jwali_payment_mode")}
                      control={salaryForm.control}
                      required
                      options={paymentRouteOptions}
                      placeholder={t("common:select", { name: t("common:jwali_payment_mode") })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {paymentChannel === "saraf"
                        ? t("common:employee_salary_route_saraf_hint")
                        : t("common:employee_salary_route_cash_hint")}
                    </p>
                  </div>
                  <DynamicLocalSelect
                    name="sarafLedgerCurrencyId"
                    label={t("common:currency")}
                    control={salaryForm.control}
                    required
                    options={currencyOptions}
                    disabled={currenciesLoading || currencyOptions.length === 0}
                    placeholder={t("common:select", { name: t("common:currency") })}
                  />
                  {paymentChannel === "saraf" ? (
                    <DynamicLocalSelect
                      name="sarafId"
                      label={t("common:rice_sale_saraf_for_ledger")}
                      control={salaryForm.control}
                      required
                      options={sarafOptions}
                      disabled={!seasonId || sarafOptions.length === 0}
                      placeholder={t("common:select", {
                        name: t("common:rice_sale_saraf_for_ledger"),
                      })}
                    />
                  ) : null}
                </>
              ) : null}
              <InputField
                name="notes"
                label={t("common:notes")}
                control={salaryForm.control}
                characterRestriction="none"
                className="md:col-span-2"
              />
            </div>

            <Button type="submit" disabled={isSavingSalaryEntry}>
              {isSavingSalaryEntry
                ? t(
                    "common:saving",
                    {
                      name:
                        salaryDialogMode === "deduction"
                          ? t("common:salary_deduction")
                          : t("common:salary_payment"),
                    },
                  )
                : editingEntry
                  ? t("common:employee_ledger_entry_save")
                  : t(
                      "common:save",
                      {
                        name:
                          salaryDialogMode === "deduction"
                            ? t("common:salary_deduction")
                            : t("common:salary_payment"),
                      },
                    )}
            </Button>
          </form>
        </Form>
        )}
      </CustomDialog>
    </div>
  );
}
