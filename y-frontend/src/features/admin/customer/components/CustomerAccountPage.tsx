import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import CheckboxField from "@/components/Fields/CheckboxField";
import InputField from "@/components/Fields/InputField";
import CustomDialog from "@/components/CustomDialog";
import { LedgerPdfRowActions } from "@/components/LedgerPdfRowActions";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveBlob } from "@/utils/saveBlob";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { openPdfPrintPreview, runLedgerPdfAction } from "@/utils/ledgerPdf";
import { ArrowLeft, Download, Pencil, PlusIcon, Printer, Share2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Form } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatQuantityWithUnit, formatWeightFromKg, seerToKg } from "@/utils/weightUnit";
import type { TFunction } from "i18next";
import {
  type CustomerAccount,
  COMPANY_SELLER_PAYMENT_ROUTE,
  createBuyerBalanceTransferFormSchema,
  createBuyerBalanceAdjustmentFormSchema,
  createBuyerPaymentFormSchema,
  createCompanyPaymentFormSchema,
  createFarmerRiceReturnFormSchema,
  createSellerBalanceTransferFormSchema,
  type BuyerBalanceTransferFormValues,
  type BuyerBalanceAdjustmentFormValues,
  type BuyerPaymentFormValues,
  type CompanyPaymentFormValues,
  type CustomerLedgerEntry,
  type FarmerRiceReturnFormValues,
  type SellerBalanceTransferFormValues,
} from "../schemas/customer";
import { useAddBuyerPayment } from "../hooks/useAddBuyerPayment";
import { useAddBuyerBalanceAdjustment } from "../hooks/useAddBuyerBalanceAdjustment";
import { useAddSellerBalanceAdjustment } from "../hooks/useAddSellerBalanceAdjustment";
import { useTransferBuyerBalance } from "../hooks/useTransferBuyerBalance";
import { useTransferSellerBalance } from "../hooks/useTransferSellerBalance";
import { useReceivableBuyers } from "../hooks/useReceivableBuyers";
import { useReceivablePaddySellers } from "../hooks/useReceivablePaddySellers";
import { useAddCompanyPayment } from "../hooks/useAddCompanyPayment";
import { useAddDebtorDisbursement } from "../hooks/useAddDebtorDisbursement";
import { useAddDebtorRepayment } from "../hooks/useAddDebtorRepayment";
import { useAddFarmerRiceReturn } from "../hooks/useAddFarmerRiceReturn";
import { useFulfillFarmerRiceReturn } from "../hooks/useFulfillFarmerRiceReturn";
import { useUpdateLedgerEntry } from "../hooks/useUpdateLedgerEntry";
import { useDeleteLedgerEntry } from "../hooks/useDeleteLedgerEntry";
import { useCustomerAccount } from "../hooks/useCustomerAccount";
import { useCurrencies } from "../../currencies/hooks/useCurrencies";
import { useSarafs } from "../../sarafi/hooks/useSarafs";
import { RICE_PAYMENT_TYPE_OPTIONS } from "../../rice-warehouses/schemas/rice-warehouse";
import { useVarietySelectOptions } from "../../verieties/hooks";
import {
  buildCustomerLedgerEntryPdfBlob,
  customerLedgerEntryPdfFileName,
  getCustomerLedgerEntryLabel,
} from "../utils/customerLedgerEntryPdf";
import {
  buildCustomerLedgerPdfBlob,
  customerLedgerPdfFileName,
} from "../utils/customerLedgerPdf";
import {
  DEFAULT_FARMER_LEDGER_FILTERS,
  collectFarmerLedgerVarietyOptions,
  computeFarmerRiceRemainingByVariety,
  filterFarmerLedgerEntries,
  hasActiveFarmerLedgerFilters,
  type FarmerLedgerFilters,
} from "../utils/farmerLedger";
import {
  DEFAULT_BUYER_LEDGER_FILTERS,
  collectBuyerLedgerFilterOptions,
  filterBuyerLedgerEntries,
  hasActiveBuyerLedgerFilters,
  type BuyerLedgerFilters,
} from "../utils/buyerLedger";
import {
  DEFAULT_SELLER_LEDGER_FILTERS,
  collectSellerLedgerFilterOptions,
  filterSellerLedgerEntries,
  hasActiveSellerLedgerFilters,
  type SellerLedgerFilters,
} from "../utils/sellerLedger";

const today = new Date().toISOString().slice(0, 10);

const numberFormatter = (value?: string | null) => {
  if (!value) {
    return "0.00";
  }

  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return value;
  }

  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const RECEIVABLE_BUYER_ENTRY_TYPES = new Set([
  "buyer_rice_sale",
  "buyer_payment",
  "buyer_payment_on_behalf",
  "buyer_payment_received_on_behalf",
  "buyer_debit",
  "buyer_credit",
  "process_production_store_sale",
]);

const formatLedgerPayment = (
  entry: CustomerLedgerEntry,
  t: TFunction,
  receivableBuyerLedger = false,
) => {
  const bits: string[] = [];
  const useBuyerPaymentLabels =
    receivableBuyerLedger ||
    RECEIVABLE_BUYER_ENTRY_TYPES.has(entry.entryType) ||
    entry.entryType === "debtor_repayment";

  if (entry.entryType === "buyer_payment_on_behalf" && entry.counterpartyCustomerName) {
    bits.push(
      `${t("common:pay_on_behalf_of")}: ${entry.counterpartyCustomerName}`,
    );
  } else if (entry.entryType === "company_payment_on_behalf" && entry.counterpartyCustomerName) {
    bits.push(
      `${t("common:seller_transfer_to")}: ${entry.counterpartyCustomerName}`,
    );
  } else if (
    (entry.entryType === "buyer_payment_received_on_behalf" ||
      entry.entryType === "buyer_payment") &&
    entry.counterpartyCustomerName
  ) {
    bits.push(
      `${t("common:received_via_payer_on_behalf")}: ${entry.counterpartyCustomerName}`,
    );
  } else if (
    entry.entryType === "company_payment_received_on_behalf" &&
    entry.counterpartyCustomerName
  ) {
    bits.push(
      `${t("common:seller_transfer_from")}: ${entry.counterpartyCustomerName}`,
    );
  }

  if (entry.paymentType) {
    bits.push(t(`common:${entry.paymentType}`));
  }

  if (
    entry.entryType !== "buyer_payment_on_behalf" &&
    entry.entryType !== "buyer_payment_received_on_behalf" &&
    entry.entryType !== "company_payment_on_behalf" &&
    entry.entryType !== "company_payment_received_on_behalf" &&
    entry.entryType !== "buyer_debit" &&
    entry.entryType !== "buyer_credit" &&
    entry.entryType !== "seller_debit" &&
    entry.entryType !== "seller_credit"
  ) {
    if (entry.paymentChannel === "saraf" && entry.sarafName) {
      bits.push(
        `${useBuyerPaymentLabels ? t("common:pay_to_saraf") : t("common:jwali_paid_by_saraf")}: ${entry.sarafName}`,
      );
    } else if (entry.paymentChannel === "cash") {
      bits.push(
        useBuyerPaymentLabels ? t("common:pay_in_cash") : t("common:jwali_paid_by_cash"),
      );
    }
  } else if (
    entry.entryType === "buyer_debit" ||
    entry.entryType === "buyer_credit" ||
    entry.entryType === "seller_debit" ||
    entry.entryType === "seller_credit"
  ) {
    bits.push(t("common:buyer_adjustment_ledger_only"));
  } else {
    bits.push(
      entry.entryType.startsWith("company_payment")
        ? t("common:seller_balance_transfer")
        : t("common:buyer_balance_transfer"),
    );
  }

  if (entry.currencyCode && entry.paymentChannel) {
    bits.push(entry.currencyCode);
  } else if (
    entry.currencyCode &&
    (entry.entryType === "buyer_payment_on_behalf" ||
      entry.entryType === "buyer_payment_received_on_behalf" ||
      entry.entryType === "company_payment_on_behalf" ||
      entry.entryType === "company_payment_received_on_behalf" ||
      entry.entryType === "buyer_debit" ||
      entry.entryType === "buyer_credit" ||
      entry.entryType === "seller_debit" ||
      entry.entryType === "seller_credit")
  ) {
    bits.push(entry.currencyCode);
  }

  if (entry.paidAmount && entry.paymentType === "partial_paid") {
    bits.push(
      `${t("common:paid_amount")}: ${numberFormatter(entry.paidAmount)}`,
    );
  }

  if (
    entry.remainingAmount &&
    (entry.paymentType === "partial_paid" || entry.paymentType === "remaining")
  ) {
    bits.push(
      `${t("common:remaining")}: ${numberFormatter(entry.remainingAmount)}`,
    );
  }

  return bits.length ? bits.join(" · ") : "—";
};

export function CustomerAccountPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [isSellerTransferDialogOpen, setIsSellerTransferDialogOpen] = useState(false);
  const [debtorPaymentMode, setDebtorPaymentMode] = useState<
    "disbursement" | "repayment" | null
  >(null);
  const [isRiceReturnDialogOpen, setIsRiceReturnDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CustomerLedgerEntry | null>(null);
  const [farmerLedgerFilters, setFarmerLedgerFilters] =
    useState<FarmerLedgerFilters>(DEFAULT_FARMER_LEDGER_FILTERS);
  const [sellerLedgerFilters, setSellerLedgerFilters] =
    useState<SellerLedgerFilters>(DEFAULT_SELLER_LEDGER_FILTERS);
  const [buyerLedgerFilters, setBuyerLedgerFilters] =
    useState<BuyerLedgerFilters>(DEFAULT_BUYER_LEDGER_FILTERS);
  const [activePdfAction, setActivePdfAction] = useState<"download" | "share" | "print" | null>(null);
  const [activeRowPdfKey, setActiveRowPdfKey] = useState<string | null>(null);
  const { data, isLoading, error } = useCustomerAccount(id);
  const { mutate: addCompanyPayment, isPending: isAddingSellerPayment } =
    useAddCompanyPayment(id);
  const { mutate: addDebtorDisbursement, isPending: isAddingDebtorDisbursement } =
    useAddDebtorDisbursement(id);
  const { mutate: addDebtorRepayment, isPending: isAddingDebtorRepayment } =
    useAddDebtorRepayment(id);
  const { mutate: addBuyerPayment, isPending: isAddingBuyerPayment } =
    useAddBuyerPayment(id);
  const { mutate: addBuyerBalanceAdjustment, isPending: isAdjustingBuyerBalance } =
    useAddBuyerBalanceAdjustment(id);
  const { mutate: addSellerBalanceAdjustment, isPending: isAdjustingSellerBalance } =
    useAddSellerBalanceAdjustment(id);
  const { mutate: transferBuyerBalance, isPending: isTransferringBalance } =
    useTransferBuyerBalance(id);
  const { mutate: transferSellerBalance, isPending: isTransferringSellerBalance } =
    useTransferSellerBalance(id);
  const { mutate: addFarmerRiceReturn, isPending: isAddingRiceReturn } =
    useAddFarmerRiceReturn(id);
  const { mutate: fulfillFarmerRiceReturn, isPending: isFulfillingReturn } =
    useFulfillFarmerRiceReturn(id);
  const { mutate: updateLedgerEntry, isPending: isUpdatingLedgerEntry } =
    useUpdateLedgerEntry(id);
  const { mutate: deleteLedgerEntry, isPending: isDeletingLedgerEntry } =
    useDeleteLedgerEntry(id);

  const paymentFormSchema = useMemo(() => createCompanyPaymentFormSchema(t), [t]);
  const paymentForm = useForm<CompanyPaymentFormValues>({
    resolver: zodResolver(paymentFormSchema) as Resolver<CompanyPaymentFormValues>,
    defaultValues: {
      amount: "",
      paymentType: "paid",
      paidAmount: "",
      paymentChannel: "cash",
      sarafId: "",
      currencyId: "",
      paymentDate: today,
      notes: "",
    },
  });

  const buyerPaymentFormSchema = useMemo(
    () => createBuyerPaymentFormSchema(t),
    [t, i18n.language],
  );

  const buyerPaymentForm = useForm<BuyerPaymentFormValues>({
    resolver: zodResolver(buyerPaymentFormSchema) as Resolver<BuyerPaymentFormValues>,
    defaultValues: {
      amount: "",
      paymentChannel: "cash",
      sarafId: "",
      currencyId: "",
      paymentDate: today,
      notes: "",
      payOnBehalf: false,
      onBehalfCustomerId: "",
      onBehalfAmount: "",
      onBehalfCurrencyId: "",
    },
  });

  const transferFormSchema = useMemo(
    () => createBuyerBalanceTransferFormSchema(t),
    [t, i18n.language],
  );
  const transferForm = useForm<BuyerBalanceTransferFormValues>({
    resolver: zodResolver(transferFormSchema) as Resolver<BuyerBalanceTransferFormValues>,
    defaultValues: {
      toCustomerId: "",
      amount: "",
      currencyId: "",
      paymentDate: today,
      notes: "",
    },
  });

  const adjustmentFormSchema = useMemo(
    () => createBuyerBalanceAdjustmentFormSchema(t),
    [t, i18n.language],
  );
  const adjustmentForm = useForm<BuyerBalanceAdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema) as Resolver<BuyerBalanceAdjustmentFormValues>,
    defaultValues: {
      direction: "credit",
      amount: "",
      currencyId: "",
      paymentDate: today,
      notes: "",
    },
  });

  const sellerTransferFormSchema = useMemo(
    () => createSellerBalanceTransferFormSchema(t),
    [t, i18n.language],
  );
  const sellerTransferForm = useForm<SellerBalanceTransferFormValues>({
    resolver: zodResolver(sellerTransferFormSchema) as Resolver<SellerBalanceTransferFormValues>,
    defaultValues: {
      toCustomerId: "",
      amount: "",
      currencyId: "",
      paymentDate: today,
      notes: "",
    },
  });

  const paymentType =
    useWatch({ control: paymentForm.control, name: "paymentType" }) || "paid";
  const paymentChannel =
    useWatch({ control: paymentForm.control, name: "paymentChannel" }) || "cash";
  const buyerPaymentChannel =
    useWatch({ control: buyerPaymentForm.control, name: "paymentChannel" }) || "cash";
  const payOnBehalf = useWatch({
    control: buyerPaymentForm.control,
    name: "payOnBehalf",
  });
  const buyerSelfAmount =
    useWatch({ control: buyerPaymentForm.control, name: "amount" })?.trim() ?? "";
  const onBehalfAmount =
    useWatch({ control: buyerPaymentForm.control, name: "onBehalfAmount" })?.trim() ??
    "";
  const buyerSelfCurrencyId =
    useWatch({ control: buyerPaymentForm.control, name: "currencyId" }) ?? "";
  const onBehalfCurrencyId =
    useWatch({ control: buyerPaymentForm.control, name: "onBehalfCurrencyId" }) ?? "";
  const hasBuyerSelfPayment = Boolean(buyerSelfAmount);
  const sameCurrencyPayment =
    Boolean(buyerSelfCurrencyId?.trim()) &&
    buyerSelfCurrencyId === onBehalfCurrencyId;
  const netSelfCollectionAmount = (() => {
    const gross = Number(buyerSelfAmount);
    if (!hasBuyerSelfPayment || Number.isNaN(gross) || gross <= 0) {
      return 0;
    }
    if (!payOnBehalf || !onBehalfAmount) {
      return gross;
    }
    const onBehalf = Number(onBehalfAmount);
    if (Number.isNaN(onBehalf) || onBehalf <= 0 || !sameCurrencyPayment) {
      return gross;
    }
    return Math.max(gross - onBehalf, 0);
  })();
  const hasBuyerSelfCollection = netSelfCollectionAmount > 0;
  const { options: otherBuyerOptions, isLoading: otherBuyersLoading } =
    useReceivableBuyers(data?.customer.seasonId, data?.customer.id);
  const { options: otherPaddySellerOptions, isLoading: otherPaddySellersLoading } =
    useReceivablePaddySellers(data?.customer.seasonId, data?.customer.id);

  const { data: currenciesData, isLoading: currenciesLoading } = useCurrencies({
    pageNumber: 1,
    pageSize: 200,
    isActive: "true",
    sortBy: "code",
    sortDirection: "asc",
  });

  const { data: sarafsData } = useSarafs({
    pageNumber: 1,
    pageSize: 500,
    seasonId: data?.customer.seasonId,
    sortBy: "name",
    sortDirection: "asc",
  });

  const paymentTypeOptions = RICE_PAYMENT_TYPE_OPTIONS.map((type) => ({
    value: type,
    label: t(`common:${type}`),
  }));

  const sarafOptions = (sarafsData?.items ?? []).map((s) => ({
    value: s.id,
    label: `${s.name} — ${s.phoneNo}`,
  }));

  const currencyOptions = (currenciesData?.items ?? []).map((c) => ({
    value: c.id,
    label: `${c.code} — ${c.name}`,
  }));

  useEffect(() => {
    if (paymentType === "remaining") {
      paymentForm.setValue("paymentChannel", "cash");
      paymentForm.setValue("sarafId", "");
    }
  }, [paymentType, paymentForm]);

  useEffect(() => {
    if (paymentChannel === "cash") {
      paymentForm.setValue("sarafId", "");
    }
  }, [paymentChannel, paymentForm]);

  useEffect(() => {
    const items = currenciesData?.items ?? [];
    if (!items.length || paymentForm.getValues("currencyId")) {
      return;
    }

    const preferred = items.find((c) => c.code === "USD") ?? items[0];
    paymentForm.setValue("currencyId", preferred.id);
  }, [currenciesData?.items, paymentForm]);

  useEffect(() => {
    const items = currenciesData?.items ?? [];
    if (!items.length || buyerPaymentForm.getValues("currencyId")) {
      return;
    }

    const preferred = items.find((c) => c.code === "USD") ?? items[0];
    buyerPaymentForm.setValue("currencyId", preferred.id);
  }, [currenciesData?.items, buyerPaymentForm]);

  useEffect(() => {
    const items = currenciesData?.items ?? [];
    if (!items.length || buyerPaymentForm.getValues("onBehalfCurrencyId")) {
      return;
    }

    const preferred = items.find((c) => c.code === "USD") ?? items[0];
    buyerPaymentForm.setValue("onBehalfCurrencyId", preferred.id);
  }, [currenciesData?.items, buyerPaymentForm]);

  useEffect(() => {
    const items = currenciesData?.items ?? [];
    if (!items.length || transferForm.getValues("currencyId")) {
      return;
    }

    const preferred = items.find((c) => c.code === "USD") ?? items[0];
    transferForm.setValue("currencyId", preferred.id);
  }, [currenciesData?.items, transferForm]);

  useEffect(() => {
    const items = currenciesData?.items ?? [];
    if (!items.length || adjustmentForm.getValues("currencyId")) {
      return;
    }

    const preferred = items.find((c) => c.code === "USD") ?? items[0];
    adjustmentForm.setValue("currencyId", preferred.id);
  }, [currenciesData?.items, adjustmentForm]);

  useEffect(() => {
    const items = currenciesData?.items ?? [];
    if (!items.length || sellerTransferForm.getValues("currencyId")) {
      return;
    }

    const preferred = items.find((c) => c.code === "USD") ?? items[0];
    sellerTransferForm.setValue("currencyId", preferred.id);
  }, [currenciesData?.items, sellerTransferForm]);

  useEffect(() => {
    if (buyerPaymentChannel === "cash") {
      buyerPaymentForm.setValue("sarafId", "");
    }
  }, [buyerPaymentChannel, buyerPaymentForm]);

  useEffect(() => {
    if (!payOnBehalf) {
      buyerPaymentForm.setValue("onBehalfCustomerId", "");
      buyerPaymentForm.setValue("onBehalfAmount", "");
      buyerPaymentForm.setValue("onBehalfCurrencyId", "");
    }
  }, [payOnBehalf, buyerPaymentForm]);

  const farmerReturnFormSchema = useMemo(() => createFarmerRiceReturnFormSchema(t), [t]);

  const farmerReturnForm = useForm<FarmerRiceReturnFormValues>({
    resolver: zodResolver(farmerReturnFormSchema) as Resolver<FarmerRiceReturnFormValues>,
    defaultValues: {
      riceQuantity: "",
      riceVariety: "",
      unit: "seven_kg",
      returnDate: today,
      scheduledFor: "",
      notes: "",
    },
  });

  const {
    options: riceReturnVarietyOptions,
    isLoading: riceReturnVarietiesLoading,
  } = useVarietySelectOptions("RICE");
  const selectedReturnVariety = farmerReturnForm.watch("riceVariety");

  useEffect(() => {
    if (
      !isRiceReturnDialogOpen ||
      riceReturnVarietiesLoading ||
      !data ||
      data.customer.type !== "paddy_farmer"
    ) {
      return;
    }

    const remaining = computeFarmerRiceRemainingByVariety(data.ledger.entries);
    const eligible = riceReturnVarietyOptions.filter((option) =>
      remaining.has(option.value),
    );

    if (eligible.length === 0) {
      return;
    }

    const current = farmerReturnForm.getValues("riceVariety");
    if (!current || !eligible.some((option) => option.value === current)) {
      farmerReturnForm.setValue("riceVariety", eligible[0].value);
    }
  }, [
    isRiceReturnDialogOpen,
    riceReturnVarietiesLoading,
    riceReturnVarietyOptions,
    farmerReturnForm,
    data,
  ]);

  if (isLoading) {
    return (
      <StatusIndicator statusType="loading" message={t("common:loading", { name: t("common:loading_customer_account") })} />
    );
  }

  if (error || !data) {
    return (
      <StatusIndicator statusType="error" message={t("common:error_message")} />
    );
  }

  const isSeller =
    data.customer.type === "paddy_seller" || data.customer.type === "rice_seller";
  const isPaddySeller = data.customer.type === "paddy_seller";
  const isRiceSeller = data.customer.type === "rice_seller";
  const isCurrencyBalanceSeller = isPaddySeller || isRiceSeller;
  const sellerCurrencyBalances = data.ledger.summary.byCurrency ?? [];
  const sellerBalanceLabels = {
    title: isPaddySeller
      ? t("common:paddy_seller_balance_by_currency")
      : t("common:rice_seller_balance_by_currency"),
    description: isPaddySeller
      ? t("common:paddy_seller_balance_by_currency_description")
      : t("common:rice_seller_balance_by_currency_description"),
    noBalance: isPaddySeller
      ? t("common:paddy_seller_no_currency_balance")
      : t("common:rice_seller_no_currency_balance"),
    purchaseTotal: isPaddySeller
      ? t("common:paddy_seller_purchase_total")
      : t("common:rice_seller_purchase_total"),
    paidToSeller: isPaddySeller
      ? t("common:paddy_seller_paid_to_seller")
      : t("common:rice_seller_paid_to_seller"),
    weOwe: isPaddySeller
      ? t("common:paddy_seller_we_owe")
      : t("common:rice_seller_we_owe"),
    owesUs: isPaddySeller
      ? t("common:paddy_seller_owes_us")
      : t("common:rice_seller_owes_us"),
  };
  const isPaddyLedgerCustomer =
    data.customer.type === "paddy_seller" || data.customer.type === "paddy_farmer";
  const isPaddyFarmer = data.customer.type === "paddy_farmer";
  const farmerLedgerVarietyOptions = isPaddyFarmer
    ? collectFarmerLedgerVarietyOptions(data.ledger.entries)
    : { paddyVarieties: [], riceVarieties: [] };
  const sellerLedgerOptions = isSeller
    ? collectSellerLedgerFilterOptions(data.ledger.entries)
    : { paddyVarieties: [], riceVarieties: [], currencies: [] as Array<{ id: string; code: string; name: string }> };
  const isBuyer = data.customer.type === "buyer";
  const buyerLedgerOptions = isBuyer
    ? collectBuyerLedgerFilterOptions(data.ledger.entries)
    : { riceVarieties: [], currencies: [] as Array<{ id: string; code: string; name: string }> };

  const filteredLedgerEntries = isPaddyFarmer
    ? filterFarmerLedgerEntries(data.ledger.entries, farmerLedgerFilters)
    : isSeller
      ? filterSellerLedgerEntries(data.ledger.entries, sellerLedgerFilters)
      : isBuyer
        ? filterBuyerLedgerEntries(data.ledger.entries, buyerLedgerFilters)
        : data.ledger.entries;

  const farmerFiltersActive = isPaddyFarmer && hasActiveFarmerLedgerFilters(farmerLedgerFilters);
  const sellerFiltersActive = isSeller && hasActiveSellerLedgerFilters(sellerLedgerFilters);
  const buyerFiltersActive = isBuyer && hasActiveBuyerLedgerFilters(buyerLedgerFilters);
  const remainingRiceByVariety = isPaddyFarmer
    ? computeFarmerRiceRemainingByVariety(data.ledger.entries)
    : new Map<string, number>();
  const eligibleReturnVarietyOptions = riceReturnVarietyOptions.filter((option) =>
    remainingRiceByVariety.has(option.value),
  );
  const selectedReturnRemainingKg = selectedReturnVariety
    ? (remainingRiceByVariety.get(selectedReturnVariety) ?? 0)
    : 0;
  const isVendor = data.customer.type === "vendor";
  const isDebtor = data.customer.type === "debtor";
  const vendorCurrencyBalances = data.ledger.summary.vendorByCurrency ?? [];
  const debtorCurrencyBalances = data.ledger.summary.debtorByCurrency ?? [];
  const vendorBalanceLabels = {
    title: t("common:vendor_balance_by_currency"),
    description: t("common:vendor_balance_by_currency_description"),
    noBalance: t("common:vendor_no_currency_balance"),
    expenseTotal: t("common:vendor_total_expenses"),
    paidToVendor: t("common:vendor_total_paid"),
    weOwe: t("common:vendor_we_owe"),
    owesUs: t("common:vendor_overpaid"),
  };
  const debtorBalanceLabels = {
    title: t("common:debtor_balance_by_currency"),
    description: t("common:debtor_balance_by_currency_description"),
    noBalance: t("common:debtor_no_currency_balance"),
    disbursedTotal: t("common:debtor_total_disbursed"),
    repaidTotal: t("common:debtor_total_repaid"),
    stillOwes: t("common:debtor_still_owes"),
    overpaid: t("common:debtor_overpaid"),
  };
  const sellerTransfersByCurrency = data.ledger.summary.sellerTransfersByCurrency ?? [];
  const hasSellerPaidTransfers = sellerTransfersByCurrency.some(
    (row) => Number(row.paidOnBehalfTotal) > 0,
  );
  const hasSellerReceivedTransfers = sellerTransfersByCurrency.some(
    (row) => Number(row.receivedOnBehalfTotal) > 0,
  );
  const buyerCurrencyBalances = data.ledger.summary.buyerByCurrency ?? [];
  const buyerTransfersByCurrency = data.ledger.summary.buyerTransfersByCurrency ?? [];
  const hasPaidOnBehalfTransfers = buyerTransfersByCurrency.some(
    (row) => Number(row.paidOnBehalfTotal) > 0,
  );
  const hasReceivedOnBehalfTransfers = buyerTransfersByCurrency.some(
    (row) => Number(row.receivedOnBehalfTotal) > 0,
  );
  const buyerBalanceLabels = {
    title: t("common:buyer_balance_by_currency"),
    description: t("common:buyer_balance_by_currency_description"),
    noBalance: t("common:buyer_no_currency_balance"),
    totalSales: t("common:buyer_total_sales"),
    totalCollected: t("common:buyer_total_collected"),
    stillOwes: t("common:buyer_still_owes"),
    overpaid: t("common:buyer_overpaid"),
  };
  const buyerWeightCards = [
    {
      label: t("common:rice_sale_count"),
      value: data.ledger.summary.riceSaleCount ?? "0",
    },
    {
      label: t("common:store_sale_count"),
      value: data.ledger.summary.storeSaleCount ?? "0",
    },
    {
      label: t("common:total_rice_purchased_kg"),
      value: formatWeightFromKg(data.ledger.summary.totalRicePurchasedKg ?? "0", t),
    },
    {
      label: t("common:total_store_weight_sold_kg"),
      value: formatWeightFromKg(data.ledger.summary.totalStoreWeightSoldKg ?? "0", t),
    },
    {
      label: t("common:total_oversold_kg"),
      value: formatWeightFromKg(data.ledger.summary.totalOversoldKg ?? "0", t),
    },
  ];
  const isReceivableBuyer = isBuyer;
  const showPaymentColumn = isSeller || isReceivableBuyer || isVendor || isDebtor;
  const canEdit = data.customer.season.status === "ACTIVE";
  const editingUsesCompanyPaymentForm = Boolean(
    editingEntry &&
      (editingEntry.entryType === "company_payment" ||
        editingEntry.entryType === "vendor_payment" ||
        editingEntry.entryType === "debtor_disbursement" ||
        editingEntry.entryType === "buyer_payment_on_behalf" ||
        editingEntry.entryType === "buyer_payment_received_on_behalf" ||
        editingEntry.entryType === "company_payment_on_behalf" ||
        editingEntry.entryType === "company_payment_received_on_behalf"),
  );
  const showBuyerPaymentFormInDialog =
    (isReceivableBuyer && !editingUsesCompanyPaymentForm) ||
    (isDebtor &&
      !editingUsesCompanyPaymentForm &&
      (debtorPaymentMode === "repayment" ||
        editingEntry?.entryType === "debtor_repayment"));
  const isAddingPayment =
    isAddingSellerPayment ||
    isAddingBuyerPayment ||
    isAddingDebtorDisbursement ||
    isAddingDebtorRepayment;
  const isSavingLedgerEntry =
    isAddingPayment ||
    isUpdatingLedgerEntry ||
    isAddingRiceReturn ||
    isTransferringBalance ||
    isTransferringSellerBalance ||
    isAdjustingBuyerBalance ||
    isAdjustingSellerBalance;

  const closePaymentDialog = () => {
    setIsPaymentDialogOpen(false);
    setDebtorPaymentMode(null);
    setEditingEntry(null);
  };

  const closeTransferDialog = () => {
    setIsTransferDialogOpen(false);
  };

  const closeAdjustmentDialog = () => {
    setIsAdjustmentDialogOpen(false);
    setEditingEntry(null);
  };

  const closeSellerTransferDialog = () => {
    setIsSellerTransferDialogOpen(false);
  };

  const closeRiceReturnDialog = () => {
    setIsRiceReturnDialogOpen(false);
    setEditingEntry(null);
  };

  const buildCompanyPaymentUpdatePayload = (values: CompanyPaymentFormValues) => ({
    amount: values.amount,
    paymentType: values.paymentType,
    paidAmount:
      values.paymentType === "partial_paid" ? values.paidAmount : undefined,
    paymentChannel: values.paymentChannel,
    currencyId: values.paymentType === "remaining" ? undefined : values.currencyId,
    sarafId:
      values.paymentChannel === "saraf" && values.paymentType !== "remaining"
        ? values.sarafId
        : undefined,
    paymentDate: values.paymentDate,
    notes: values.notes,
  });

  const buildBuyerPaymentUpdatePayload = (values: BuyerPaymentFormValues) => ({
    amount: values.amount?.trim() || undefined,
    paymentType: values.amount?.trim() ? "paid" : undefined,
    paymentChannel: values.paymentChannel,
    currencyId: values.currencyId?.trim() || undefined,
    sarafId:
      values.paymentChannel === "saraf" ? values.sarafId || undefined : undefined,
    paymentDate: values.paymentDate,
    notes: values.notes,
  });

  const openEntryForEdit = (entry: CustomerLedgerEntry) => {
    setEditingEntry(entry);

    if (entry.entryType === "farmer_rice_return") {
      farmerReturnForm.reset({
        riceQuantity: entry.riceQuantity ?? "",
        riceVariety: entry.riceVariety ?? "",
        unit: (entry.unit as FarmerRiceReturnFormValues["unit"]) ?? "seven_kg",
        returnDate: entry.occurredAt.slice(0, 10),
        scheduledFor: entry.scheduledFor?.slice(0, 10) ?? "",
        notes: entry.notes ?? "",
      });
      setIsRiceReturnDialogOpen(true);
      return;
    }

    if (entry.entryType === "buyer_payment" || entry.entryType === "debtor_repayment") {
      buyerPaymentForm.reset({
        amount: entry.amount ?? "",
        paymentChannel: entry.paymentChannel ?? "cash",
        sarafId: entry.sarafId ?? "",
        currencyId: entry.currencyId ?? "",
        paymentDate: entry.occurredAt.slice(0, 10),
        notes: entry.notes ?? "",
        payOnBehalf: false,
        onBehalfCustomerId: "",
        onBehalfAmount: "",
        onBehalfCurrencyId: "",
      });
      setIsPaymentDialogOpen(true);
      return;
    }

    if (
      entry.entryType === "buyer_debit" ||
      entry.entryType === "buyer_credit" ||
      entry.entryType === "seller_debit" ||
      entry.entryType === "seller_credit"
    ) {
      adjustmentForm.reset({
        direction:
          entry.entryType === "buyer_debit" || entry.entryType === "seller_debit"
            ? "debit"
            : "credit",
        amount: entry.amount ?? "",
        currencyId: entry.currencyId ?? "",
        paymentDate: entry.occurredAt.slice(0, 10),
        notes: entry.notes ?? "",
      });
      setIsAdjustmentDialogOpen(true);
      return;
    }

    paymentForm.reset({
      amount: entry.amount ?? "",
      paymentType:
        (entry.paymentType as CompanyPaymentFormValues["paymentType"]) ?? "paid",
      paidAmount: entry.paidAmount ?? "",
      paymentChannel: entry.paymentChannel ?? "cash",
      sarafId: entry.sarafId ?? "",
      currencyId: entry.currencyId ?? "",
      paymentDate: entry.occurredAt.slice(0, 10),
      notes: entry.notes ?? "",
    });
    setIsPaymentDialogOpen(true);
  };

  const handleDeleteEntry = (entry: CustomerLedgerEntry) => {
    if (!confirm(t("common:customer_ledger_entry_delete_confirm"))) {
      return;
    }

    deleteLedgerEntry({
      entryId: entry.id,
      counterpartyCustomerId: entry.counterpartyCustomerId,
    });
  };

  const paymentRouteOptions = COMPANY_SELLER_PAYMENT_ROUTE.map((route) => ({
    value: route,
    label:
      route === "cash"
        ? isReceivableBuyer
          ? t("common:pay_in_cash")
          : t("common:jwali_paid_by_cash")
        : isReceivableBuyer
          ? t("common:pay_to_saraf")
          : t("common:jwali_paid_by_saraf"),
  }));

  const resetBuyerPaymentForm = () => {
    buyerPaymentForm.reset({
      amount: "",
      paymentChannel: "cash",
      sarafId: "",
      currencyId:
        currenciesData?.items?.find((c) => c.code === "USD")?.id ??
        currenciesData?.items?.[0]?.id ??
        "",
      paymentDate: today,
      notes: "",
      payOnBehalf: false,
      onBehalfCustomerId: "",
      onBehalfAmount: "",
      onBehalfCurrencyId:
        currenciesData?.items?.find((c) => c.code === "USD")?.id ??
        currenciesData?.items?.[0]?.id ??
        "",
    });
  };

  const resetTransferForm = () => {
    transferForm.reset({
      toCustomerId: "",
      amount: "",
      currencyId:
        currenciesData?.items?.find((c) => c.code === "USD")?.id ??
        currenciesData?.items?.[0]?.id ??
        "",
      paymentDate: today,
      notes: "",
    });
  };

  const resetAdjustmentForm = () => {
    adjustmentForm.reset({
      direction: "credit",
      amount: "",
      currencyId:
        currenciesData?.items?.find((c) => c.code === "USD")?.id ??
        currenciesData?.items?.[0]?.id ??
        "",
      paymentDate: today,
      notes: "",
    });
  };

  const resetSellerTransferForm = () => {
    sellerTransferForm.reset({
      toCustomerId: "",
      amount: "",
      currencyId:
        currenciesData?.items?.find((c) => c.code === "USD")?.id ??
        currenciesData?.items?.[0]?.id ??
        "",
      paymentDate: today,
      notes: "",
    });
  };

  const summaryCards = isBuyer
    ? [
        ...buyerWeightCards,
        ...buyerCurrencyBalances.flatMap((row) => [
          {
            label: `${buyerBalanceLabels.totalSales} (${row.currencyCode})`,
            value: `${numberFormatter(row.totalSaleAmount)} ${row.currencyCode}`,
          },
          {
            label: `${buyerBalanceLabels.totalCollected} (${row.currencyCode})`,
            value: `${numberFormatter(row.totalPaidAmount)} ${row.currencyCode}`,
          },
          {
            label: `${buyerBalanceLabels.stillOwes} (${row.currencyCode})`,
            value: `${numberFormatter(row.outstandingAmount)} ${row.currencyCode}`,
          },
          {
            label: `${buyerBalanceLabels.overpaid} (${row.currencyCode})`,
            value: `${numberFormatter(row.amountBuyerOverpaid)} ${row.currencyCode}`,
          },
        ]),
      ]
    : isCurrencyBalanceSeller
      ? sellerCurrencyBalances.flatMap((row) => [
          {
            label: `${sellerBalanceLabels.purchaseTotal} (${row.currencyCode})`,
            value: `${numberFormatter(row.totalPurchaseAmount)} ${row.currencyCode}`,
          },
          {
            label: `${sellerBalanceLabels.paidToSeller} (${row.currencyCode})`,
            value: `${numberFormatter(row.totalPaidAmount)} ${row.currencyCode}`,
          },
          {
            label: `${sellerBalanceLabels.weOwe} (${row.currencyCode})`,
            value: `${numberFormatter(row.amountWeOweSeller)} ${row.currencyCode}`,
          },
          {
            label: `${sellerBalanceLabels.owesUs} (${row.currencyCode})`,
            value: `${numberFormatter(row.amountSellerOwesUs)} ${row.currencyCode}`,
          },
        ])
      : isVendor
        ? vendorCurrencyBalances.flatMap((row) => [
            {
              label: `${vendorBalanceLabels.expenseTotal} (${row.currencyCode})`,
              value: `${numberFormatter(row.totalExpenseAmount)} ${row.currencyCode}`,
            },
            {
              label: `${vendorBalanceLabels.paidToVendor} (${row.currencyCode})`,
              value: `${numberFormatter(row.totalPaidAmount)} ${row.currencyCode}`,
            },
            {
              label: `${vendorBalanceLabels.weOwe} (${row.currencyCode})`,
              value: `${numberFormatter(row.amountWeOweVendor)} ${row.currencyCode}`,
            },
            {
              label: `${vendorBalanceLabels.owesUs} (${row.currencyCode})`,
              value: `${numberFormatter(row.amountVendorOwesUs)} ${row.currencyCode}`,
            },
          ])
        : isDebtor
          ? debtorCurrencyBalances.flatMap((row) => [
              {
                label: `${debtorBalanceLabels.disbursedTotal} (${row.currencyCode})`,
                value: `${numberFormatter(row.totalDisbursedAmount)} ${row.currencyCode}`,
              },
              {
                label: `${debtorBalanceLabels.repaidTotal} (${row.currencyCode})`,
                value: `${numberFormatter(row.totalRepaidAmount)} ${row.currencyCode}`,
              },
              {
                label: `${debtorBalanceLabels.stillOwes} (${row.currencyCode})`,
                value: `${numberFormatter(row.outstandingAmount)} ${row.currencyCode}`,
              },
              {
                label: `${debtorBalanceLabels.overpaid} (${row.currencyCode})`,
                value: `${numberFormatter(row.debtorOverpaidAmount)} ${row.currencyCode}`,
              },
            ])
          : [
          {
            label: t("common:total_paddy_received"),
            value: formatWeightFromKg(data.ledger.summary.totalPaddyReceived ?? "0", t),
          },
          {
            label: t("common:rice_obligation"),
            value: formatWeightFromKg(data.ledger.summary.totalRiceObligation ?? "0", t),
          },
          {
            label: t("common:rice_returned"),
            value: formatWeightFromKg(data.ledger.summary.totalRiceReturned ?? "0", t),
          },
          {
            label: t("common:remaining_rice_to_return"),
            value: formatWeightFromKg(data.ledger.summary.remainingRiceToReturn ?? "0", t),
          },
        ];
  const ledgerFileName = customerLedgerPdfFileName(data.customer.name);

  const handleEntryPdfAction = async (
    entry: CustomerLedgerEntry,
    action: "download" | "share" | "print",
  ) => {
    const rowKey = entry.id;
    setActiveRowPdfKey(`${rowKey}-${action}`);
    const fileName = customerLedgerEntryPdfFileName(data.customer.name, entry);
    const shareTitle = t("common:customer_ledger_entry_pdf_title", {
      name: data.customer.name,
      entry: getCustomerLedgerEntryLabel(entry, t),
    });

    await runLedgerPdfAction(
      action,
      () => buildCustomerLedgerEntryPdfBlob(data, entry, t),
      fileName,
      shareTitle,
      t,
      (error) => toast.error(getErrorMessage(error, t)),
    );
    setActiveRowPdfKey(null);
  };

  const withLedgerPdf = async <T,>(
    action: "download" | "share" | "print",
    callback: (blob: Blob) => Promise<T> | T,
  ) => {
    setActivePdfAction(action);

    try {
      const blob = await buildCustomerLedgerPdfBlob(data, summaryCards, t);
      return await callback(blob);
    } catch (error) {
      toast.error(getErrorMessage(error, t));
      return undefined;
    } finally {
      setActivePdfAction(null);
    }
  };

  const handlePrint = async () => {
    await withLedgerPdf("print", async (blob) => {
      openPdfPrintPreview(blob, t);
    });
  };

  const handleDownload = async () => {
    await withLedgerPdf("download", async (blob) => {
      saveBlob(blob, ledgerFileName);
      toast.success(t("common:ledger_pdf_downloaded"));
    });
  };

  const handleShare = async () => {
    await withLedgerPdf("share", async (blob) => {
      const pdfFile = new File([blob], ledgerFileName, { type: "application/pdf" });

      if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({
          title: t("common:customer_ledger_pdf_title", { name: data.customer.name }),
          files: [pdfFile],
        });
        return;
      }

      saveBlob(blob, ledgerFileName);
      toast.info(t("common:ledger_pdf_share_fallback"));
    });
  };

  return (
    <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <div className="flex w-full min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Button asChild variant="ghost" className="px-0">
              <Link to="/yk/customers">
                <ArrowLeft className="me-2 h-4 w-4" />
                {t("common:back_to_customers")}
              </Link>
            </Button>
            <div>
              <h2 className="text-xl font-bold">{data.customer.name}</h2>
              <p className="text-sm text-muted-foreground">
                {t("common:customer_account_ledger_for", {
                  type: t(`common:${data.customer.type}`),
                  season: data.customer.seasonName,
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
            {canEdit && (isSeller || isReceivableBuyer || isVendor) ? (
              <Button onClick={() => setIsPaymentDialogOpen(true)}>
                <PlusIcon className="me-2 h-4 w-4" />
                {t("common:customer_add_payment")}
              </Button>
            ) : null}
            {canEdit && isReceivableBuyer ? (
              <Button
                variant="outline"
                onClick={() => {
                  resetTransferForm();
                  setIsTransferDialogOpen(true);
                }}
              >
                <PlusIcon className="me-2 h-4 w-4" />
                {t("common:buyer_transfer_balance")}
              </Button>
            ) : null}
            {canEdit && isReceivableBuyer ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingEntry(null);
                  resetAdjustmentForm();
                  setIsAdjustmentDialogOpen(true);
                }}
              >
                <PlusIcon className="me-2 h-4 w-4" />
                {t("common:buyer_debit_credit")}
              </Button>
            ) : null}
            {canEdit && isPaddySeller ? (
              <Button
                variant="outline"
                onClick={() => {
                  resetSellerTransferForm();
                  setIsSellerTransferDialogOpen(true);
                }}
              >
                <PlusIcon className="me-2 h-4 w-4" />
                {t("common:seller_transfer_balance")}
              </Button>
            ) : null}
            {canEdit && isPaddySeller ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingEntry(null);
                  resetAdjustmentForm();
                  setIsAdjustmentDialogOpen(true);
                }}
              >
                <PlusIcon className="me-2 h-4 w-4" />
                {t("common:seller_debit_credit")}
              </Button>
            ) : null}
            {canEdit && isDebtor ? (
              <>
                <Button
                  onClick={() => {
                    setDebtorPaymentMode("disbursement");
                    setIsPaymentDialogOpen(true);
                  }}
                >
                  <PlusIcon className="me-2 h-4 w-4" />
                  {t("common:customer_add_disbursement")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDebtorPaymentMode("repayment");
                    setIsPaymentDialogOpen(true);
                  }}
                >
                  <PlusIcon className="me-2 h-4 w-4" />
                  {t("common:customer_add_repayment")}
                </Button>
              </>
            ) : null}
            {canEdit && data.customer.type === "paddy_farmer" ? (
              <Button
                onClick={() => setIsRiceReturnDialogOpen(true)}
                disabled={eligibleReturnVarietyOptions.length === 0}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                {t("common:farmer_rice_return_add")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:type")}</CardDescription>
              <CardTitle>{t(`common:${data.customer.type}`)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:phone_number")}</CardDescription>
              <CardTitle>{data.customer.phoneNo}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:address")}</CardDescription>
              <CardTitle className="text-base">{data.customer.address}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:season")}</CardDescription>
              <CardTitle>{data.customer.seasonName}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {isCurrencyBalanceSeller ? (
          <>
          <Card>
            <CardHeader>
              <CardTitle>{sellerBalanceLabels.title}</CardTitle>
              <CardDescription>{sellerBalanceLabels.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {sellerCurrencyBalances.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  {sellerBalanceLabels.noBalance}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[48rem] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-start text-muted-foreground">
                        <th className="px-4 py-3 font-medium text-start">{t("common:currency")}</th>
                        <th className="px-4 py-3 font-medium text-end whitespace-normal">
                          {sellerBalanceLabels.purchaseTotal}
                        </th>
                        <th className="px-4 py-3 font-medium text-end whitespace-normal">
                          {sellerBalanceLabels.paidToSeller}
                        </th>
                        <th className="px-4 py-3 font-medium text-end whitespace-normal text-amber-700">
                          {sellerBalanceLabels.weOwe}
                        </th>
                        <th className="px-4 py-3 font-medium text-end whitespace-normal text-emerald-700">
                          {sellerBalanceLabels.owesUs}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellerCurrencyBalances.map((row) => (
                        <tr key={row.currencyId} className="border-b last:border-b-0">
                          <td className="px-4 py-3 font-medium text-start">
                            {row.currencyCode}
                            <span className="ms-2 text-muted-foreground">
                              ({row.currencyName})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums">
                            {numberFormatter(row.totalPurchaseAmount)} {row.currencyCode}
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums">
                            {numberFormatter(row.totalPaidAmount)} {row.currencyCode}
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums font-medium text-amber-700">
                            {numberFormatter(row.amountWeOweSeller)} {row.currencyCode}
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums font-medium text-emerald-700">
                            {numberFormatter(row.amountSellerOwesUs)} {row.currencyCode}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          {isPaddySeller && (hasSellerPaidTransfers || hasSellerReceivedTransfers) ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("common:seller_transfer_paid_by_currency")}</CardTitle>
                  <CardDescription>
                    {t("common:seller_transfer_paid_by_currency_description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!hasSellerPaidTransfers ? (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                      {t("common:seller_no_transfer_paid_activity")}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/40 text-start text-muted-foreground">
                            <th className="px-4 py-3 font-medium text-start">
                              {t("common:currency")}
                            </th>
                            <th className="px-4 py-3 font-medium text-end">
                              {t("common:seller_transfer_paid_on_behalf")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sellerTransfersByCurrency
                            .filter((row) => Number(row.paidOnBehalfTotal) > 0)
                            .map((row) => (
                              <tr key={`seller-paid-${row.currencyId}`} className="border-b last:border-b-0">
                                <td className="px-4 py-3 font-medium text-start">
                                  {row.currencyCode}
                                  <span className="ms-2 text-muted-foreground">
                                    ({row.currencyName})
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-end tabular-nums">
                                  {numberFormatter(row.paidOnBehalfTotal)} {row.currencyCode}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t("common:seller_transfer_received_by_currency")}</CardTitle>
                  <CardDescription>
                    {t("common:seller_transfer_received_by_currency_description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!hasSellerReceivedTransfers ? (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                      {t("common:seller_no_transfer_received_activity")}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/40 text-start text-muted-foreground">
                            <th className="px-4 py-3 font-medium text-start">
                              {t("common:currency")}
                            </th>
                            <th className="px-4 py-3 font-medium text-end">
                              {t("common:seller_transfer_received_on_behalf")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sellerTransfersByCurrency
                            .filter((row) => Number(row.receivedOnBehalfTotal) > 0)
                            .map((row) => (
                              <tr key={`seller-received-${row.currencyId}`} className="border-b last:border-b-0">
                                <td className="px-4 py-3 font-medium text-start">
                                  {row.currencyCode}
                                  <span className="ms-2 text-muted-foreground">
                                    ({row.currencyName})
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-end tabular-nums">
                                  {numberFormatter(row.receivedOnBehalfTotal)} {row.currencyCode}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
          </>
        ) : isBuyer ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {buyerWeightCards.map((card) => (
                <Card key={card.label}>
                  <CardHeader className="pb-2">
                    <CardDescription>{card.label}</CardDescription>
                    <CardTitle>{card.value}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{buyerBalanceLabels.title}</CardTitle>
                <CardDescription>{buyerBalanceLabels.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {buyerCurrencyBalances.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    {buyerBalanceLabels.noBalance}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[48rem] text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-start text-muted-foreground">
                          <th className="px-4 py-3 font-medium text-start">{t("common:currency")}</th>
                          <th className="px-4 py-3 font-medium text-end whitespace-normal">
                            {buyerBalanceLabels.totalSales}
                          </th>
                          <th className="px-4 py-3 font-medium text-end whitespace-normal">
                            {buyerBalanceLabels.totalCollected}
                          </th>
                          <th className="px-4 py-3 font-medium text-end whitespace-normal text-amber-700">
                            {buyerBalanceLabels.stillOwes}
                          </th>
                          <th className="px-4 py-3 font-medium text-end whitespace-normal text-emerald-700">
                            {buyerBalanceLabels.overpaid}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {buyerCurrencyBalances.map((row) => (
                          <tr key={row.currencyId} className="border-b last:border-b-0">
                            <td className="px-4 py-3 font-medium text-start">
                              {row.currencyCode}
                              <span className="ms-2 text-muted-foreground">
                                ({row.currencyName})
                              </span>
                            </td>
                            <td className="px-4 py-3 text-end tabular-nums">
                              {numberFormatter(row.totalSaleAmount)} {row.currencyCode}
                            </td>
                            <td className="px-4 py-3 text-end tabular-nums">
                              {numberFormatter(row.totalPaidAmount)} {row.currencyCode}
                            </td>
                            <td className="px-4 py-3 text-end tabular-nums font-medium text-amber-700">
                              {numberFormatter(row.outstandingAmount)} {row.currencyCode}
                            </td>
                            <td className="px-4 py-3 text-end tabular-nums font-medium text-emerald-700">
                              {numberFormatter(row.amountBuyerOverpaid)} {row.currencyCode}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            {(hasPaidOnBehalfTransfers || hasReceivedOnBehalfTransfers) ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("common:buyer_pay_on_behalf_by_currency")}</CardTitle>
                    <CardDescription>
                      {t("common:buyer_pay_on_behalf_by_currency_description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!hasPaidOnBehalfTransfers ? (
                      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                        {t("common:buyer_no_pay_on_behalf_activity")}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/40 text-start text-muted-foreground">
                              <th className="px-4 py-3 font-medium text-start">
                                {t("common:currency")}
                              </th>
                              <th className="px-4 py-3 font-medium text-end">
                                {t("common:buyer_transfer_paid_on_behalf")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {buyerTransfersByCurrency
                              .filter((row) => Number(row.paidOnBehalfTotal) > 0)
                              .map((row) => (
                                <tr key={`paid-${row.currencyId}`} className="border-b last:border-b-0">
                                  <td className="px-4 py-3 font-medium text-start">
                                    {row.currencyCode}
                                    <span className="ms-2 text-muted-foreground">
                                      ({row.currencyName})
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-end tabular-nums">
                                    {numberFormatter(row.paidOnBehalfTotal)} {row.currencyCode}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("common:buyer_received_on_behalf_by_currency")}</CardTitle>
                    <CardDescription>
                      {t("common:buyer_received_on_behalf_by_currency_description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!hasReceivedOnBehalfTransfers ? (
                      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                        {t("common:buyer_no_received_on_behalf_activity")}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/40 text-start text-muted-foreground">
                              <th className="px-4 py-3 font-medium text-start">
                                {t("common:currency")}
                              </th>
                              <th className="px-4 py-3 font-medium text-end">
                                {t("common:buyer_transfer_received_on_behalf")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {buyerTransfersByCurrency
                              .filter((row) => Number(row.receivedOnBehalfTotal) > 0)
                              .map((row) => (
                                <tr key={`received-${row.currencyId}`} className="border-b last:border-b-0">
                                  <td className="px-4 py-3 font-medium text-start">
                                    {row.currencyCode}
                                    <span className="ms-2 text-muted-foreground">
                                      ({row.currencyName})
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-end tabular-nums">
                                    {numberFormatter(row.receivedOnBehalfTotal)} {row.currencyCode}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </>
        ) : isVendor ? (
          <Card>
            <CardHeader>
              <CardTitle>{vendorBalanceLabels.title}</CardTitle>
              <CardDescription>{vendorBalanceLabels.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {vendorCurrencyBalances.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  {vendorBalanceLabels.noBalance}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[48rem] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-start text-muted-foreground">
                        <th className="px-4 py-3 font-medium text-start">{t("common:currency")}</th>
                        <th className="px-4 py-3 font-medium text-end whitespace-normal">
                          {vendorBalanceLabels.expenseTotal}
                        </th>
                        <th className="px-4 py-3 font-medium text-end whitespace-normal">
                          {vendorBalanceLabels.paidToVendor}
                        </th>
                        <th className="px-4 py-3 font-medium text-end whitespace-normal text-amber-700">
                          {vendorBalanceLabels.weOwe}
                        </th>
                        <th className="px-4 py-3 font-medium text-end whitespace-normal text-emerald-700">
                          {vendorBalanceLabels.owesUs}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorCurrencyBalances.map((row) => (
                        <tr key={row.currencyId} className="border-b last:border-b-0">
                          <td className="px-4 py-3 font-medium text-start">
                            {row.currencyCode}
                            <span className="ms-2 text-muted-foreground">
                              ({row.currencyName})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums">
                            {numberFormatter(row.totalExpenseAmount)} {row.currencyCode}
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums">
                            {numberFormatter(row.totalPaidAmount)} {row.currencyCode}
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums font-medium text-amber-700">
                            {numberFormatter(row.amountWeOweVendor)} {row.currencyCode}
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums font-medium text-emerald-700">
                            {numberFormatter(row.amountVendorOwesUs)} {row.currencyCode}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : isDebtor ? (
          <Card>
            <CardHeader>
              <CardTitle>{debtorBalanceLabels.title}</CardTitle>
              <CardDescription>{debtorBalanceLabels.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {debtorCurrencyBalances.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  {debtorBalanceLabels.noBalance}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[48rem] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-start text-muted-foreground">
                        <th className="px-4 py-3 font-medium text-start">{t("common:currency")}</th>
                        <th className="px-4 py-3 font-medium text-end whitespace-normal">
                          {debtorBalanceLabels.disbursedTotal}
                        </th>
                        <th className="px-4 py-3 font-medium text-end whitespace-normal">
                          {debtorBalanceLabels.repaidTotal}
                        </th>
                        <th className="px-4 py-3 font-medium text-end whitespace-normal text-amber-700">
                          {debtorBalanceLabels.stillOwes}
                        </th>
                        <th className="px-4 py-3 font-medium text-end whitespace-normal text-emerald-700">
                          {debtorBalanceLabels.overpaid}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {debtorCurrencyBalances.map((row) => (
                        <tr key={row.currencyId} className="border-b last:border-b-0">
                          <td className="px-4 py-3 font-medium text-start">
                            {row.currencyCode}
                            <span className="ms-2 text-muted-foreground">
                              ({row.currencyName})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums">
                            {numberFormatter(row.totalDisbursedAmount)} {row.currencyCode}
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums">
                            {numberFormatter(row.totalRepaidAmount)} {row.currencyCode}
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums font-medium text-amber-700">
                            {numberFormatter(row.outstandingAmount)} {row.currencyCode}
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums font-medium text-emerald-700">
                            {numberFormatter(row.debtorOverpaidAmount)} {row.currencyCode}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : !isVendor && !isDebtor ? (
          <div
            className={`grid gap-4 ${
              summaryCards.length > 3
                ? "xl:grid-cols-4 md:grid-cols-2"
                : summaryCards.length === 2
                  ? "md:grid-cols-2"
                  : "md:grid-cols-3"
            }`}
          >
            {summaryCards.map((card) => (
              <Card key={card.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{card.label}</CardDescription>
                  <CardTitle>{card.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{t("common:ledger_entries")}</CardTitle>
            <CardDescription>
              {isBuyer
                ? t("common:buyer_ledger_entries_description")
                : isVendor
                  ? t("common:vendor_ledger_entries_description")
                  : isDebtor
                    ? t("common:debtor_ledger_entries_description")
                    : t("common:ledger_entries_description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPaddyFarmer ? (
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("common:farmer_ledger_filter_entry_type")}
                  </p>
                  <Select
                    value={farmerLedgerFilters.entryType}
                    onValueChange={(value) =>
                      setFarmerLedgerFilters((current) => ({
                        ...current,
                        entryType: value as FarmerLedgerFilters["entryType"],
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("common:farmer_ledger_filter_all_types")}
                      </SelectItem>
                      <SelectItem value="farmer_obligation">
                        {t("common:ledger_entry_farmer_obligation")}
                      </SelectItem>
                      <SelectItem value="farmer_rice_return">
                        {t("common:ledger_entry_farmer_rice_return")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("common:farmer_ledger_filter_return_status")}
                  </p>
                  <Select
                    value={farmerLedgerFilters.returnStatus}
                    onValueChange={(value) =>
                      setFarmerLedgerFilters((current) => ({
                        ...current,
                        returnStatus: value as FarmerLedgerFilters["returnStatus"],
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("common:farmer_ledger_filter_all_returns")}
                      </SelectItem>
                      <SelectItem value="returned">
                        {t("common:farmer_ledger_filter_returned")}
                      </SelectItem>
                      <SelectItem value="pending">
                        {t("common:farmer_ledger_filter_pending_return")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("common:paddy_variety")}
                  </p>
                  <Select
                    value={farmerLedgerFilters.paddyVariety}
                    onValueChange={(value) =>
                      setFarmerLedgerFilters((current) => ({
                        ...current,
                        paddyVariety: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("common:farmer_ledger_filter_all_varieties")}
                      </SelectItem>
                      {farmerLedgerVarietyOptions.paddyVarieties.map((variety) => (
                        <SelectItem key={variety} value={variety}>
                          {variety}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("common:rice_variety")}
                  </p>
                  <Select
                    value={farmerLedgerFilters.riceVariety}
                    onValueChange={(value) =>
                      setFarmerLedgerFilters((current) => ({
                        ...current,
                        riceVariety: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("common:farmer_ledger_filter_all_varieties")}
                      </SelectItem>
                      {farmerLedgerVarietyOptions.riceVarieties.map((variety) => (
                        <SelectItem key={variety} value={variety}>
                          {variety}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {farmerFiltersActive ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFarmerLedgerFilters(DEFAULT_FARMER_LEDGER_FILTERS)}
                  >
                    {t("common:clear_filters")}
                  </Button>
                ) : null}
              </div>
            ) : isSeller ? (
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("common:farmer_ledger_filter_entry_type")}
                  </p>
                  <Select
                    value={sellerLedgerFilters.entryType}
                    onValueChange={(value) =>
                      setSellerLedgerFilters((current) => ({
                        ...current,
                        entryType: value as SellerLedgerFilters["entryType"],
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common:all")}</SelectItem>
                      <SelectItem value="company_receivable">
                        {t("common:ledger_entry_company_receivable")}
                      </SelectItem>
                      <SelectItem value="company_payment">
                        {t("common:ledger_entry_company_payment")}
                      </SelectItem>
                      {isPaddySeller ? (
                        <>
                          <SelectItem value="company_payment_on_behalf">
                            {t("common:ledger_entry_company_payment_on_behalf")}
                          </SelectItem>
                          <SelectItem value="company_payment_received_on_behalf">
                            {t("common:ledger_entry_company_payment_received_on_behalf")}
                          </SelectItem>
                          <SelectItem value="seller_debit">
                            {t("common:ledger_entry_seller_debit")}
                          </SelectItem>
                          <SelectItem value="seller_credit">
                            {t("common:ledger_entry_seller_credit")}
                          </SelectItem>
                        </>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>

                {isPaddySeller ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("common:paddy_variety")}
                    </p>
                    <Select
                      value={sellerLedgerFilters.paddyVariety}
                      onValueChange={(value) =>
                        setSellerLedgerFilters((current) => ({
                          ...current,
                          paddyVariety: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common:all")}</SelectItem>
                        {sellerLedgerOptions.paddyVarieties.map((variety) => (
                          <SelectItem key={variety} value={variety}>
                            {variety}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {isRiceSeller ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("common:rice_variety")}
                    </p>
                    <Select
                      value={sellerLedgerFilters.riceVariety}
                      onValueChange={(value) =>
                        setSellerLedgerFilters((current) => ({
                          ...current,
                          riceVariety: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common:all")}</SelectItem>
                        {sellerLedgerOptions.riceVarieties.map((variety) => (
                          <SelectItem key={variety} value={variety}>
                            {variety}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("common:currency")}
                  </p>
                  <Select
                    value={sellerLedgerFilters.currency}
                    onValueChange={(value) =>
                      setSellerLedgerFilters((current) => ({
                        ...current,
                        currency: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common:all")}</SelectItem>
                      {sellerLedgerOptions.currencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.id}>
                          {currency.code}
                          {currency.name ? (
                            <span className="ml-2 text-muted-foreground">
                              {currency.name}
                            </span>
                          ) : null}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("common:payment_type")}
                  </p>
                  <Select
                    value={sellerLedgerFilters.paymentType}
                    onValueChange={(value) =>
                      setSellerLedgerFilters((current) => ({
                        ...current,
                        paymentType: value as SellerLedgerFilters["paymentType"],
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common:all")}</SelectItem>
                      {RICE_PAYMENT_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`common:${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {sellerFiltersActive ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSellerLedgerFilters(DEFAULT_SELLER_LEDGER_FILTERS)}
                  >
                    {t("common:clear_filters")}
                  </Button>
                ) : null}
              </div>
            ) : isBuyer ? (
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("common:farmer_ledger_filter_entry_type")}
                  </p>
                  <Select
                    value={buyerLedgerFilters.entryType}
                    onValueChange={(value) =>
                      setBuyerLedgerFilters((current) => ({
                        ...current,
                        entryType: value as BuyerLedgerFilters["entryType"],
                      }))
                    }
                  >
                    <SelectTrigger className="w-[240px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common:all")}</SelectItem>
                      <SelectItem value="buyer_rice_sale">
                        {t("common:ledger_entry_rice_sale")}
                      </SelectItem>
                      <SelectItem value="process_production_store_sale">
                        {t("common:ledger_entry_store_variety_sale")}
                      </SelectItem>
                      <SelectItem value="buyer_sale_oversell">
                        {t("common:ledger_entry_sale_oversell")}
                      </SelectItem>
                      <SelectItem value="buyer_payment">
                        {t("common:ledger_entry_buyer_payment")}
                      </SelectItem>
                      <SelectItem value="buyer_payment_on_behalf">
                        {t("common:ledger_entry_buyer_payment_on_behalf")}
                      </SelectItem>
                      <SelectItem value="buyer_payment_received_on_behalf">
                        {t("common:ledger_entry_buyer_payment_received_on_behalf")}
                      </SelectItem>
                      <SelectItem value="buyer_debit">
                        {t("common:ledger_entry_buyer_debit")}
                      </SelectItem>
                      <SelectItem value="buyer_credit">
                        {t("common:ledger_entry_buyer_credit")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("common:rice_variety")}
                  </p>
                  <Select
                    value={buyerLedgerFilters.riceVariety}
                    onValueChange={(value) =>
                      setBuyerLedgerFilters((current) => ({
                        ...current,
                        riceVariety: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common:all")}</SelectItem>
                      {buyerLedgerOptions.riceVarieties.map((variety) => (
                        <SelectItem key={variety} value={variety}>
                          {variety}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("common:currency")}
                  </p>
                  <Select
                    value={buyerLedgerFilters.currency}
                    onValueChange={(value) =>
                      setBuyerLedgerFilters((current) => ({
                        ...current,
                        currency: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common:all")}</SelectItem>
                      {buyerLedgerOptions.currencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.id}>
                          {currency.code}
                          {currency.name ? (
                            <span className="ml-2 text-muted-foreground">
                              {currency.name}
                            </span>
                          ) : null}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("common:payment_type")}
                  </p>
                  <Select
                    value={buyerLedgerFilters.paymentType}
                    onValueChange={(value) =>
                      setBuyerLedgerFilters((current) => ({
                        ...current,
                        paymentType: value as BuyerLedgerFilters["paymentType"],
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common:all")}</SelectItem>
                      {RICE_PAYMENT_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`common:${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {buyerFiltersActive ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setBuyerLedgerFilters(DEFAULT_BUYER_LEDGER_FILTERS)}
                  >
                    {t("common:clear_filters")}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {data.ledger.entries.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                {t("common:no_ledger_entries")}
              </div>
            ) : filteredLedgerEntries.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                {t("common:farmer_ledger_no_matching_entries")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common:type")}</TableHead>
                      <TableHead>{t("common:date")}</TableHead>
                      <TableHead>{t("common:bill_no")}</TableHead>
                      <TableHead>{t("common:amount")}</TableHead>
                      {isCurrencyBalanceSeller || isBuyer || isVendor || isDebtor ? (
                        <TableHead>{t("common:currency")}</TableHead>
                      ) : null}
                      {showPaymentColumn ? (
                        <TableHead>{t("common:payment_type")}</TableHead>
                      ) : null}
                      {isPaddyLedgerCustomer ? (
                        <TableHead>{t("common:paddy_variety")}</TableHead>
                      ) : null}
                      <TableHead>
                        {isPaddyLedgerCustomer ? t("common:paddy_quantity") : t("common:paddy")}
                      </TableHead>
                      <TableHead>{t("common:rice")}</TableHead>
                      <TableHead>{t("common:rice_variety")}</TableHead>
                      {isPaddyFarmer ? (
                        <TableHead>{t("common:farmer_ledger_return_status")}</TableHead>
                      ) : null}
                      <TableHead>{t("common:scheduled")}</TableHead>
                      <TableHead>{t("common:notes")}</TableHead>
                      <TableHead className="text-right">{t("common:actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLedgerEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {entry.entryType === "buyer_rice_sale"
                            ? t("common:ledger_entry_rice_sale")
                            : entry.entryType === "buyer_payment"
                              ? t("common:ledger_entry_buyer_payment")
                            : entry.entryType === "buyer_payment_on_behalf"
                              ? t("common:ledger_entry_buyer_payment_on_behalf")
                            : entry.entryType === "buyer_payment_received_on_behalf"
                              ? t("common:ledger_entry_buyer_payment_received_on_behalf")
                            : entry.entryType === "buyer_debit"
                              ? t("common:ledger_entry_buyer_debit")
                            : entry.entryType === "buyer_credit"
                              ? t("common:ledger_entry_buyer_credit")
                            : entry.entryType === "seller_debit"
                              ? t("common:ledger_entry_seller_debit")
                            : entry.entryType === "seller_credit"
                              ? t("common:ledger_entry_seller_credit")
                            : entry.entryType === "company_payment_on_behalf"
                              ? t("common:ledger_entry_company_payment_on_behalf")
                            : entry.entryType === "company_payment_received_on_behalf"
                              ? t("common:ledger_entry_company_payment_received_on_behalf")
                              : entry.entryType === "process_production_store_sale"
                                ? t("common:ledger_entry_store_variety_sale")
                                : entry.entryType === "buyer_sale_oversell"
                                  ? t("common:ledger_entry_sale_oversell")
                                : getCustomerLedgerEntryLabel(entry, t)}
                        </TableCell>
                        <TableCell>{dateFormatter(entry.occurredAt)}</TableCell>
                        <TableCell>{entry.billNo ?? "—"}</TableCell>
                        <TableCell>{entry.amount ? numberFormatter(entry.amount) : "—"}</TableCell>
                        {isCurrencyBalanceSeller || isBuyer || isVendor || isDebtor ? (
                          <TableCell>
                            {entry.currencyCode ? (
                              <span>
                                {entry.currencyCode}
                                {entry.currencyName ? (
                                  <span className="ml-2 text-muted-foreground">
                                    {entry.currencyName}
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        ) : null}
                        {showPaymentColumn ? (
                          <TableCell>
                            {formatLedgerPayment(entry, t, isReceivableBuyer)}
                          </TableCell>
                        ) : null}
                        {isPaddyLedgerCustomer ? (
                          <TableCell>{entry.paddyVariety || "—"}</TableCell>
                        ) : null}
                        <TableCell>
                          {entry.paddyQuantity
                            ? formatQuantityWithUnit(
                                entry.paddyQuantity,
                                entry.unit ?? undefined,
                                t,
                              )
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {entry.riceQuantity
                            ? formatQuantityWithUnit(
                                entry.riceQuantity,
                                entry.unit ?? undefined,
                                t,
                              )
                            : "-"}
                          {Number(entry.oversoldQuantity ?? 0) > 0 &&
                          entry.entryType !== "buyer_sale_oversell" ? (
                            <p className="text-xs text-amber-700">
                              {t("common:sale_oversold_weight")}:{" "}
                              {formatQuantityWithUnit(
                                entry.oversoldQuantity ?? "0",
                                entry.unit ?? undefined,
                                t,
                              )}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>{entry.riceVariety || "-"}</TableCell>
                        {isPaddyFarmer ? (
                          <TableCell>
                            {entry.entryType === "farmer_rice_return" ? (
                              entry.riceStockFulfilledAt ? (
                                <span className="text-xs font-medium text-emerald-700">
                                  {t("common:farmer_ledger_filter_returned")}
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-amber-700">
                                  {t("common:farmer_ledger_filter_pending_return")}
                                </span>
                              )
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        ) : null}
                        <TableCell>
                          {entry.scheduledFor ? dateFormatter(entry.scheduledFor) : "-"}
                        </TableCell>
                        <TableCell>{entry.notes || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
                            {isPaddyFarmer && canEdit && entry.entryType === "farmer_rice_return" ? (
                              entry.riceStockFulfilledAt ? (
                                <span className="text-xs text-muted-foreground">
                                  {t("common:farmer_rice_return_stock_issued")}
                                </span>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isFulfillingReturn}
                                  onClick={() => fulfillFarmerRiceReturn(entry.id)}
                                >
                                  {t("common:farmer_rice_return_mark_returned")}
                                </Button>
                              )
                            ) : null}
                            {canEdit && entry.isEditable ? (
                              <>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  disabled={isSavingLedgerEntry || isDeletingLedgerEntry}
                                  onClick={() => openEntryForEdit(entry)}
                                  aria-label={t("common:customer_ledger_entry_edit")}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  disabled={isSavingLedgerEntry || isDeletingLedgerEntry}
                                  onClick={() => handleDeleteEntry(entry)}
                                  aria-label={t("common:customer_ledger_entry_delete")}
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
          </CardContent>
        </Card>
      </div>

      <CustomDialog
        open={isPaymentDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsPaymentDialogOpen(true);
            return;
          }
          closePaymentDialog();
        }}
        title={
          editingEntry
            ? t("common:customer_ledger_entry_edit_title")
            : isDebtor
              ? debtorPaymentMode === "repayment" ||
                  editingEntry?.entryType === "debtor_repayment"
                ? t("common:customer_add_repayment")
                : t("common:customer_add_disbursement")
              : t("common:customer_add_payment")
        }
        description={
          editingEntry
            ? t("common:customer_ledger_entry_edit_description")
            : isBuyer
              ? t("common:customer_buyer_payment_description")
              : isVendor
                ? t("common:customer_vendor_payment_description")
                : isDebtor
                  ? debtorPaymentMode === "repayment" ||
                      editingEntry?.entryType === "debtor_repayment"
                    ? t("common:customer_debtor_repayment_description")
                    : t("common:customer_debtor_disbursement_description")
                  : t("common:customer_seller_payment_description")
        }
        contentClassName={
          showBuyerPaymentFormInDialog
            ? "w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto sm:max-w-6xl"
            : "min-w-3xl"
        }
      >
        {showBuyerPaymentFormInDialog ? (
        <Form {...buyerPaymentForm}>
          <form
            onSubmit={buyerPaymentForm.handleSubmit((values) => {
              if (editingEntry) {
                updateLedgerEntry(
                  {
                    entryId: editingEntry.id,
                    values: buildBuyerPaymentUpdatePayload(values),
                    counterpartyCustomerId: editingEntry.counterpartyCustomerId,
                  },
                  { onSuccess: closePaymentDialog },
                );
                return;
              }

              if (isDebtor) {
                addDebtorRepayment(values, {
                  onSuccess: () => {
                    resetBuyerPaymentForm();
                    closePaymentDialog();
                  },
                });
                return;
              }

              addBuyerPayment(values, {
                onSuccess: () => {
                  resetBuyerPaymentForm();
                  closePaymentDialog();
                },
              });
            })}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
              <div className="flex h-full flex-col gap-3 rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">{t("common:buyer_payment_for_self")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("common:buyer_payment_total_hint")}
                  </p>
                </div>
                <InputField
                  name="amount"
                  label={t("common:amount_to_pay")}
                  control={buyerPaymentForm.control}
                  type="number"
                  characterRestriction="none"
                />
                <DatePickerField
                  name="paymentDate"
                  label={t("common:date")}
                  control={buyerPaymentForm.control}
                  required
                />
                <DynamicLocalSelect
                  name="currencyId"
                  label={t("common:currency")}
                  control={buyerPaymentForm.control}
                  required={hasBuyerSelfPayment}
                  options={currencyOptions}
                  disabled={currenciesLoading || currencyOptions.length === 0}
                  placeholder={t("common:select", { name: t("common:currency") })}
                />
                {payOnBehalf &&
                onBehalfAmount &&
                sameCurrencyPayment &&
                netSelfCollectionAmount > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("common:buyer_payment_net_collection_hint", {
                      net: numberFormatter(String(netSelfCollectionAmount)),
                      total: numberFormatter(buyerSelfAmount),
                      onBehalf: numberFormatter(onBehalfAmount),
                    })}
                  </p>
                ) : null}
              </div>

              <div className="flex h-full flex-col gap-3 rounded-lg border p-4">
                <CheckboxField
                  name="payOnBehalf"
                  label={t("common:pay_on_behalf_of_other_buyer")}
                  control={buyerPaymentForm.control}
                  disabled={Boolean(editingEntry)}
                />
                <div>
                  <p className="text-sm font-medium">
                    {t("common:buyer_payment_on_behalf_section")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("common:buyer_balance_transfer_hint")}
                  </p>
                </div>
                {payOnBehalf ? (
                  <>
                    <DynamicLocalSelect
                      name="onBehalfCustomerId"
                      label={t("common:select_buyer_to_pay_for")}
                      control={buyerPaymentForm.control}
                      required
                      options={otherBuyerOptions}
                      disabled={otherBuyersLoading || otherBuyerOptions.length === 0}
                      placeholder={t("common:select", {
                        name: t("common:select_buyer_to_pay_for"),
                      })}
                    />
                    <InputField
                      name="onBehalfAmount"
                      label={t("common:on_behalf_amount")}
                      control={buyerPaymentForm.control}
                      required
                      type="number"
                      characterRestriction="none"
                    />
                    <DynamicLocalSelect
                      name="onBehalfCurrencyId"
                      label={t("common:currency")}
                      control={buyerPaymentForm.control}
                      required
                      options={currencyOptions}
                      disabled={currenciesLoading || currencyOptions.length === 0}
                      placeholder={t("common:select", { name: t("common:currency") })}
                    />
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("common:buyer_balance_transfer_hint")}
                  </p>
                )}
              </div>

              <div className="flex h-full flex-col gap-3 rounded-lg border bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-medium">
                    {t("common:buyer_self_payment_collection")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("common:buyer_self_payment_collection_description")}
                  </p>
                </div>
                {hasBuyerSelfCollection ? (
                  <>
                    <DynamicLocalSelect
                      name="paymentChannel"
                      label={t("common:jwali_payment_mode")}
                      control={buyerPaymentForm.control}
                      required
                      options={paymentRouteOptions}
                      placeholder={t("common:select", { name: t("common:jwali_payment_mode") })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {buyerPaymentChannel === "saraf"
                        ? t("common:customer_buyer_route_saraf_hint")
                        : t("common:customer_buyer_route_cash_hint")}
                    </p>
                    {buyerPaymentChannel === "saraf" ? (
                      <DynamicLocalSelect
                        name="sarafId"
                        label={t("common:rice_sale_saraf_for_ledger")}
                        control={buyerPaymentForm.control}
                        required
                        options={sarafOptions}
                        disabled={!data.customer.seasonId || sarafOptions.length === 0}
                        placeholder={t("common:select", {
                          name: t("common:rice_sale_saraf_for_ledger"),
                        })}
                      />
                    ) : null}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("common:buyer_self_payment_collection_description")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-end sm:justify-between">
              <InputField
                name="notes"
                label={t("common:notes")}
                control={buyerPaymentForm.control}
                characterRestriction="none"
                className="sm:max-w-md"
              />
              <Button type="submit" disabled={isSavingLedgerEntry} className="shrink-0">
                {isSavingLedgerEntry
                  ? t("common:customer_saving_payment")
                  : editingEntry
                    ? t("common:customer_ledger_entry_save")
                    : t("common:customer_save_payment")}
              </Button>
            </div>
          </form>
        </Form>
        ) : (
        <Form {...paymentForm}>
          <form
            onSubmit={paymentForm.handleSubmit((values) => {
              if (editingEntry) {
                updateLedgerEntry(
                  {
                    entryId: editingEntry.id,
                    values: buildCompanyPaymentUpdatePayload(values),
                    counterpartyCustomerId: editingEntry.counterpartyCustomerId,
                  },
                  { onSuccess: closePaymentDialog },
                );
                return;
              }

              if (isDebtor) {
                addDebtorDisbursement(values, {
                  onSuccess: () => {
                    paymentForm.reset({
                      amount: "",
                      paymentType: "paid",
                      paidAmount: "",
                      paymentChannel: "cash",
                      sarafId: "",
                      currencyId:
                        currenciesData?.items?.find((c) => c.code === "USD")?.id ??
                        currenciesData?.items?.[0]?.id ??
                        "",
                      paymentDate: today,
                      notes: "",
                    });
                    closePaymentDialog();
                  },
                });
                return;
              }

              addCompanyPayment(values, {
                onSuccess: () => {
                  paymentForm.reset({
                    amount: "",
                    paymentType: "paid",
                    paidAmount: "",
                    paymentChannel: "cash",
                    sarafId: "",
                    currencyId:
                      currenciesData?.items?.find((c) => c.code === "USD")?.id ??
                      currenciesData?.items?.[0]?.id ??
                      "",
                    paymentDate: today,
                    notes: "",
                  });
                  closePaymentDialog();
                },
              });
            })}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                name="amount"
                label={t("common:amount")}
                control={paymentForm.control}
                required
                type="number"
                characterRestriction="none"
              />
              <DatePickerField
                name="paymentDate"
                label={t("common:date")}
                control={paymentForm.control}
                required
              />

              <div className="md:col-span-2 space-y-2 rounded-lg border bg-muted/20 p-4">
                <DynamicLocalSelect
                  name="paymentChannel"
                  label={t("common:jwali_payment_mode")}
                  control={paymentForm.control}
                  required
                  options={paymentRouteOptions}
                  placeholder={t("common:select", { name: t("common:jwali_payment_mode") })}
                  disabled={paymentType === "remaining"}
                />
                <p className="text-xs text-muted-foreground">
                  {paymentType === "remaining"
                    ? t("common:paddy_seller_route_remaining_hint")
                    : paymentChannel === "saraf"
                      ? t("common:customer_seller_route_saraf_hint")
                      : t("common:customer_seller_route_cash_hint")}
                </p>
              </div>

              <DynamicLocalSelect
                name="paymentType"
                label={t("common:payment_type")}
                control={paymentForm.control}
                required
                options={paymentTypeOptions}
                placeholder={t("common:select", { name: t("common:payment_type") })}
              />

              <InputField
                name="paidAmount"
                label={t("common:paid_amount")}
                control={paymentForm.control}
                type="number"
                disabled={paymentType !== "partial_paid"}
                characterRestriction="none"
              />

              {paymentType !== "remaining" ? (
                <DynamicLocalSelect
                  name="currencyId"
                  label={t("common:currency")}
                  control={paymentForm.control}
                  required
                  options={currencyOptions}
                  disabled={currenciesLoading || currencyOptions.length === 0}
                  placeholder={t("common:select", { name: t("common:currency") })}
                />
              ) : null}

              {paymentChannel === "saraf" && paymentType !== "remaining" ? (
                <DynamicLocalSelect
                  name="sarafId"
                  label={t("common:rice_sale_saraf_for_ledger")}
                  control={paymentForm.control}
                  required
                  options={sarafOptions}
                  disabled={!data?.customer.seasonId || sarafOptions.length === 0}
                  placeholder={t("common:select", { name: t("common:rice_sale_saraf_for_ledger") })}
                />
              ) : null}

              <InputField
                name="notes"
                label={t("common:notes")}
                control={paymentForm.control}
                characterRestriction="none"
                className="md:col-span-2"
              />
            </div>

            <Button type="submit" disabled={isSavingLedgerEntry}>
              {isSavingLedgerEntry
                ? t("common:customer_saving_payment")
                : editingEntry
                  ? t("common:customer_ledger_entry_save")
                  : t("common:customer_save_payment")}
            </Button>
          </form>
        </Form>
        )}
      </CustomDialog>

      <CustomDialog
        open={isTransferDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsTransferDialogOpen(true);
            return;
          }
          closeTransferDialog();
        }}
        title={t("common:buyer_transfer_balance")}
        description={t("common:buyer_transfer_balance_description")}
        contentClassName="min-w-3xl"
      >
        <Form {...transferForm}>
          <form
            onSubmit={transferForm.handleSubmit((values) => {
              transferBuyerBalance(values, {
                onSuccess: () => {
                  resetTransferForm();
                  closeTransferDialog();
                },
              });
            })}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DynamicLocalSelect
                name="toCustomerId"
                label={t("common:buyer_transfer_to_buyer")}
                control={transferForm.control}
                required
                options={otherBuyerOptions}
                disabled={otherBuyersLoading || otherBuyerOptions.length === 0}
                placeholder={t("common:select", {
                  name: t("common:buyer_transfer_to_buyer"),
                })}
              />
              <InputField
                name="amount"
                label={t("common:amount")}
                control={transferForm.control}
                required
                type="number"
                characterRestriction="none"
              />
              <DynamicLocalSelect
                name="currencyId"
                label={t("common:currency")}
                control={transferForm.control}
                required
                options={currencyOptions}
                disabled={currenciesLoading || currencyOptions.length === 0}
                placeholder={t("common:select", { name: t("common:currency") })}
              />
              <DatePickerField
                name="paymentDate"
                label={t("common:date")}
                control={transferForm.control}
                required
              />
              <InputField
                name="notes"
                label={t("common:notes")}
                control={transferForm.control}
                characterRestriction="none"
                className="md:col-span-2"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("common:buyer_transfer_balance_hint")}
            </p>
            <Button type="submit" disabled={isTransferringBalance}>
              {isTransferringBalance
                ? t("common:customer_saving_payment")
                : t("common:buyer_transfer_balance_submit")}
            </Button>
          </form>
        </Form>
      </CustomDialog>

      <CustomDialog
        open={isAdjustmentDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsAdjustmentDialogOpen(true);
            return;
          }
          closeAdjustmentDialog();
        }}
        title={
          isPaddySeller
            ? t("common:seller_debit_credit")
            : t("common:buyer_debit_credit")
        }
        description={
          isPaddySeller
            ? t("common:seller_debit_credit_description")
            : t("common:buyer_debit_credit_description")
        }
        contentClassName="min-w-3xl"
      >
        <Form {...adjustmentForm}>
          <form
            onSubmit={adjustmentForm.handleSubmit((values) => {
              if (editingEntry) {
                updateLedgerEntry(
                  {
                    entryId: editingEntry.id,
                    values: {
                      amount: values.amount,
                      currencyId: values.currencyId,
                      paymentDate: values.paymentDate,
                      notes: values.notes,
                    },
                  },
                  {
                    onSuccess: () => {
                      resetAdjustmentForm();
                      closeAdjustmentDialog();
                    },
                  },
                );
                return;
              }

              const onSuccess = () => {
                resetAdjustmentForm();
                closeAdjustmentDialog();
              };

              if (isPaddySeller) {
                addSellerBalanceAdjustment(values, { onSuccess });
                return;
              }

              addBuyerBalanceAdjustment(values, { onSuccess });
            })}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DynamicLocalSelect
                name="direction"
                label={t("common:buyer_adjustment_direction")}
                control={adjustmentForm.control}
                required
                disabled={Boolean(editingEntry)}
                options={[
                  {
                    value: "debit",
                    label: isPaddySeller
                      ? t("common:seller_adjustment_debit")
                      : t("common:buyer_adjustment_debit"),
                  },
                  {
                    value: "credit",
                    label: isPaddySeller
                      ? t("common:seller_adjustment_credit")
                      : t("common:buyer_adjustment_credit"),
                  },
                ]}
                placeholder={t("common:select", {
                  name: t("common:buyer_adjustment_direction"),
                })}
              />
              <InputField
                name="amount"
                label={t("common:amount")}
                control={adjustmentForm.control}
                required
                type="number"
                characterRestriction="none"
              />
              <DynamicLocalSelect
                name="currencyId"
                label={t("common:currency")}
                control={adjustmentForm.control}
                required
                options={currencyOptions}
                disabled={currenciesLoading || currencyOptions.length === 0}
                placeholder={t("common:select", { name: t("common:currency") })}
              />
              <DatePickerField
                name="paymentDate"
                label={t("common:date")}
                control={adjustmentForm.control}
                required
              />
              <InputField
                name="notes"
                label={t("common:notes")}
                control={adjustmentForm.control}
                characterRestriction="none"
                className="md:col-span-2"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isPaddySeller
                ? t("common:seller_debit_credit_hint")
                : t("common:buyer_debit_credit_hint")}
            </p>
            <Button type="submit" disabled={isSavingLedgerEntry}>
              {isSavingLedgerEntry
                ? t("common:customer_saving_payment")
                : editingEntry
                  ? t("common:customer_ledger_entry_save")
                  : isPaddySeller
                    ? t("common:seller_debit_credit_submit")
                    : t("common:buyer_debit_credit_submit")}
            </Button>
          </form>
        </Form>
      </CustomDialog>

      <CustomDialog
        open={isSellerTransferDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsSellerTransferDialogOpen(true);
            return;
          }
          closeSellerTransferDialog();
        }}
        title={t("common:seller_transfer_balance")}
        description={t("common:seller_transfer_balance_description")}
        contentClassName="min-w-3xl"
      >
        <Form {...sellerTransferForm}>
          <form
            onSubmit={sellerTransferForm.handleSubmit((values) => {
              transferSellerBalance(values, {
                onSuccess: () => {
                  resetSellerTransferForm();
                  closeSellerTransferDialog();
                },
              });
            })}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DynamicLocalSelect
                name="toCustomerId"
                label={t("common:seller_transfer_to_seller")}
                control={sellerTransferForm.control}
                required
                options={otherPaddySellerOptions}
                disabled={otherPaddySellersLoading || otherPaddySellerOptions.length === 0}
                placeholder={t("common:select", {
                  name: t("common:seller_transfer_to_seller"),
                })}
              />
              <InputField
                name="amount"
                label={t("common:amount")}
                control={sellerTransferForm.control}
                required
                type="number"
                characterRestriction="none"
              />
              <DynamicLocalSelect
                name="currencyId"
                label={t("common:currency")}
                control={sellerTransferForm.control}
                required
                options={currencyOptions}
                disabled={currenciesLoading || currencyOptions.length === 0}
                placeholder={t("common:select", { name: t("common:currency") })}
              />
              <DatePickerField
                name="paymentDate"
                label={t("common:date")}
                control={sellerTransferForm.control}
                required
              />
              <InputField
                name="notes"
                label={t("common:notes")}
                control={sellerTransferForm.control}
                characterRestriction="none"
                className="md:col-span-2"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("common:seller_transfer_balance_hint")}
            </p>
            <Button type="submit" disabled={isTransferringSellerBalance}>
              {isTransferringSellerBalance
                ? t("common:customer_saving_payment")
                : t("common:seller_transfer_balance_submit")}
            </Button>
          </form>
        </Form>
      </CustomDialog>

      <CustomDialog
        open={isRiceReturnDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsRiceReturnDialogOpen(true);
            return;
          }
          closeRiceReturnDialog();
        }}
        title={
          editingEntry
            ? t("common:customer_ledger_entry_edit_title")
            : t("common:farmer_rice_return_dialog_title")
        }
        description={
          editingEntry
            ? t("common:customer_ledger_entry_edit_description")
            : t("common:farmer_rice_return_dialog_description")
        }
        contentClassName="min-w-3xl"
      >
        <Form {...farmerReturnForm}>
          <form
            onSubmit={farmerReturnForm.handleSubmit((values) => {
              if (editingEntry) {
                updateLedgerEntry(
                  {
                    entryId: editingEntry.id,
                    values: {
                      riceQuantity: values.riceQuantity,
                      riceVariety: values.riceVariety,
                      unit: values.unit,
                      returnDate: values.returnDate,
                      scheduledFor: values.scheduledFor || null,
                      notes: values.notes,
                    },
                  },
                  { onSuccess: closeRiceReturnDialog },
                );
                return;
              }

              const remainingKg =
                remainingRiceByVariety.get(values.riceVariety) ?? 0;

              if (remainingKg <= 0) {
                toast.error(t("common:farmer_rice_return_wrong_variety"));
                return;
              }

              if (seerToKg(values.riceQuantity) > remainingKg) {
                toast.error(t("common:farmer_rice_return_exceeds_remaining"));
                return;
              }

              addFarmerRiceReturn(values, {
                onSuccess: () => {
                  farmerReturnForm.reset({
                    riceQuantity: "",
                    riceVariety: "",
                    unit: "seven_kg",
                    returnDate: today,
                    scheduledFor: "",
                    notes: "",
                  });
                  closeRiceReturnDialog();
                },
              });
            })}
            className="space-y-4"
          >
            <input type="hidden" {...farmerReturnForm.register("unit")} />
            {eligibleReturnVarietyOptions.length === 0 ? (
              <p className="text-sm text-amber-700">
                {t("common:farmer_rice_return_no_obligation")}
              </p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                name="riceQuantity"
                label={t("common:quantity_seer")}
                control={farmerReturnForm.control}
                required
                type="number"
                characterRestriction="none"
              />
              <DynamicLocalSelect
                name="riceVariety"
                label={t("common:rice_variety")}
                control={farmerReturnForm.control}
                required
                options={eligibleReturnVarietyOptions}
                placeholder={t("common:select", { name: t("common:rice_variety") })}
                disabled={
                  riceReturnVarietiesLoading ||
                  eligibleReturnVarietyOptions.length === 0
                }
              />
              {selectedReturnRemainingKg > 0 ? (
                <p className="text-xs text-muted-foreground md:col-span-2">
                  {t("common:farmer_rice_return_remaining_hint", {
                    variety: selectedReturnVariety,
                    weight: formatWeightFromKg(selectedReturnRemainingKg, t),
                  })}
                </p>
              ) : null}
              <DatePickerField
                name="returnDate"
                label={t("common:farmer_rice_return_date")}
                control={farmerReturnForm.control}
                required
              />
              <DatePickerField
                name="scheduledFor"
                label={t("common:scheduled")}
                control={farmerReturnForm.control}
              />
              <InputField
                name="notes"
                label={t("common:notes")}
                control={farmerReturnForm.control}
                characterRestriction="none"
                className="md:col-span-2"
              />
            </div>

            <Button
              type="submit"
              disabled={
                isSavingLedgerEntry ||
                riceReturnVarietiesLoading ||
                (!editingEntry && eligibleReturnVarietyOptions.length === 0)
              }
            >
              {isSavingLedgerEntry
                ? t("common:farmer_rice_return_saving")
                : editingEntry
                  ? t("common:customer_ledger_entry_save")
                  : t("common:farmer_rice_return_save")}
            </Button>
          </form>
        </Form>
      </CustomDialog>
    </div>
  );
}
