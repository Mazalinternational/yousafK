import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, PlusIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LedgerPdfActionButtons } from "@/components/LedgerPdfActionButtons";
import { LedgerPdfRowActions } from "@/components/LedgerPdfRowActions";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { runLedgerPdfAction, sanitizeLedgerFileName } from "@/utils/ledgerPdf";
import {
  buildJwaliLedgerEntryPdfBlob,
  buildJwaliLedgerPdfBlob,
  buildJwaliPaymentPdfBlob,
  jwaliLedgerEntryPdfFileName,
  jwaliPaymentPdfFileName,
} from "../utils/jwaliLedgerPdf";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import CustomDialog from "@/components/CustomDialog";
import { StatusIndicator } from "@/components/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatCurrencyLabel, formatCurrencyTitle } from "@/utils/currencyDisplay";
import {
  formatDisplayAmount,
  formatDisplayNumber,
  getDisplayLocale,
} from "@/utils/displayLocale";
import { useCurrencies } from "../../currencies/hooks/useCurrencies";
import { useSarafs } from "../../sarafi/hooks/useSarafs";
import { useAddJwaliLedgerEntry } from "../hooks/useAddJwaliLedgerEntry";
import { useAddJwaliPayment } from "../hooks/useAddJwaliPayment";
import { useJwaliAccount } from "../hooks/useJwaliAccount";
import { useDeleteJwaliLedgerEntry } from "../hooks/useDeleteJwaliLedgerEntry";
import { useDeleteJwaliPayment } from "../hooks/useDeleteJwaliPayment";
import { useUpdateJwaliLedgerEntry } from "../hooks/useUpdateJwaliLedgerEntry";
import { useUpdateJwaliPayment } from "../hooks/useUpdateJwaliPayment";
import {
  JWALI_PAYMENT_ROUTE,
  createJwaliLedgerEntryFormSchema,
  createJwaliPaymentFormSchema,
  type JwaliLedgerEntryFormValues,
  type JwaliPayment,
  type JwaliPaymentFormValues,
} from "../schemas/jwali";

const today = new Date().toISOString().slice(0, 10);

const formatJwaliPayment = (payment: JwaliPayment, t: (key: string) => string) => {
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

export function JwaliAccountPage() {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const { id } = useParams();
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{
    id: string;
    values: JwaliLedgerEntryFormValues;
  } | null>(null);
  const [editingPayment, setEditingPayment] = useState<{
    id: string;
    values: { amount: string; paymentDate: string; notes?: string };
  } | null>(null);
  const [activePdfAction, setActivePdfAction] = useState<
    "download" | "share" | "print" | null
  >(null);
  const [activeRowPdfKey, setActiveRowPdfKey] = useState<string | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<
    | { type: "entry"; id: string }
    | { type: "payment"; id: string }
    | null
  >(null);
  const { data, isLoading, error } = useJwaliAccount(id);
  const { mutate: addLedgerEntry, isPending: isAddingLedgerEntry } = useAddJwaliLedgerEntry(id);
  const { mutate: addPayment, isPending: isAddingPayment } = useAddJwaliPayment(id);
  const { mutate: updateLedgerEntry, isPending: isUpdatingEntry } = useUpdateJwaliLedgerEntry(id);
  const { mutate: deleteLedgerEntry } = useDeleteJwaliLedgerEntry(id);
  const { mutate: updatePayment, isPending: isUpdatingPayment } = useUpdateJwaliPayment(id);
  const { mutate: deletePayment } = useDeleteJwaliPayment(id);

  const ledgerEntryFormSchema = useMemo(() => createJwaliLedgerEntryFormSchema(t), [t]);
  const paymentFormSchema = useMemo(() => createJwaliPaymentFormSchema(t), [t]);

  const seasonId = data?.jwali.seasonId;

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
      JWALI_PAYMENT_ROUTE.map((route) => ({
        value: route,
        label:
          route === "cash" ? t("common:jwali_paid_by_cash") : t("common:jwali_paid_by_saraf"),
      })),
    [t],
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

  const defaultCurrencyId =
    currenciesData?.items?.find((c) => c.code === "USD")?.id ??
    currenciesData?.items?.[0]?.id ??
    "";

  const entryForm = useForm<JwaliLedgerEntryFormValues>({
    resolver: zodResolver(ledgerEntryFormSchema) as Resolver<JwaliLedgerEntryFormValues>,
    defaultValues: {
      bagCount: "",
      ratePerBag: "",
      currencyId: defaultCurrencyId,
      occurredAt: today,
      notes: "",
    },
  });

  const paymentForm = useForm<JwaliPaymentFormValues>({
    resolver: zodResolver(paymentFormSchema) as Resolver<JwaliPaymentFormValues>,
    defaultValues: {
      amount: "",
      paymentDate: today,
      paymentChannel: "cash",
      currencyId: defaultCurrencyId,
      sarafId: "",
      notes: "",
    },
  });

  const paymentChannel = useWatch({
    control: paymentForm.control,
    name: "paymentChannel",
  });

  const summaryCards = useMemo(() => {
    if (!data) {
      return [];
    }

    const balanceLabels = {
      chargeTotal: t("common:jwali_charge_total"),
      paidTotal: t("common:jwali_paid_total"),
      weStillOwe: t("common:jwali_we_still_owe"),
      owesUs: t("common:jwali_owes_us"),
    };
    const currencyBalances = data.ledger.summary.byCurrency ?? [];

    return [
      {
        label: t("common:total_bags"),
        value: formatDisplayNumber(data.ledger.summary.totalBags, locale),
      },
      ...currencyBalances.flatMap((row) => [
        {
          label: `${balanceLabels.chargeTotal} (${row.currencyCode})`,
          value: `${formatDisplayAmount(row.totalChargeAmount, locale)} ${row.currencyCode}`,
        },
        {
          label: `${balanceLabels.paidTotal} (${row.currencyCode})`,
          value: `${formatDisplayAmount(row.totalPaidAmount, locale)} ${row.currencyCode}`,
        },
        {
          label: `${balanceLabels.weStillOwe} (${row.currencyCode})`,
          value: `${formatDisplayAmount(row.amountWeOweJwali, locale)} ${row.currencyCode}`,
        },
        {
          label: `${balanceLabels.owesUs} (${row.currencyCode})`,
          value: `${formatDisplayAmount(row.amountJwaliOwesUs, locale)} ${row.currencyCode}`,
        },
      ]),
    ];
  }, [data, locale, t]);

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("common:jwali_account") })}
      />
    );
  }

  if (error || !data) {
    return <StatusIndicator statusType="error" message={t("common:error_message")} />;
  }

  const canEdit = data.jwali.season?.status === "ACTIVE";
  const currencyBalances = data.ledger.summary.byCurrency ?? [];
  const balanceLabels = {
    title: t("common:jwali_balance_by_currency"),
    description: t("common:jwali_balance_by_currency_description"),
    noBalance: t("common:jwali_no_currency_balance"),
    chargeTotal: t("common:jwali_charge_total"),
    paidTotal: t("common:jwali_paid_total"),
    weStillOwe: t("common:jwali_we_still_owe"),
    owesUs: t("common:jwali_owes_us"),
  };

  const ledgerFileName = sanitizeLedgerFileName(data.jwali.name, "jwali-ledger");
  const shareTitle = t("common:jwali_ledger_share_title", {
    name: data.jwali.name,
    ledger: t("common:jwali_ledger"),
  });

  const handlePdfAction = async (action: "download" | "share" | "print") => {
    setActivePdfAction(action);
    await runLedgerPdfAction(
      action,
      () => buildJwaliLedgerPdfBlob(data, summaryCards, t),
      ledgerFileName,
      shareTitle,
      t,
      (error) => toast.error(getErrorMessage(error, t)),
    );
    setActivePdfAction(null);
  };

  const handleEntryPdfAction = async (
    entry: (typeof data)["ledger"]["entries"][number],
    action: "download" | "share" | "print",
  ) => {
    setActiveRowPdfKey(`${entry.id}-${action}`);
    const fileName = jwaliLedgerEntryPdfFileName(data.jwali.name, entry);
    const title = t("common:jwali_ledger_share_title", {
      name: data.jwali.name,
      ledger: t("common:jwali_entry"),
    });

    await runLedgerPdfAction(
      action,
      () => buildJwaliLedgerEntryPdfBlob(data, summaryCards, entry, t),
      fileName,
      title,
      t,
      (error) => toast.error(getErrorMessage(error, t)),
    );
    setActiveRowPdfKey(null);
  };

  const handlePaymentPdfAction = async (
    payment: (typeof data)["ledger"]["payments"][number],
    action: "download" | "share" | "print",
  ) => {
    setActiveRowPdfKey(`${payment.id}-${action}`);
    const fileName = jwaliPaymentPdfFileName(data.jwali.name, payment);
    const title = t("common:jwali_ledger_share_title", {
      name: data.jwali.name,
      ledger: t("common:jwali_payment"),
    });

    await runLedgerPdfAction(
      action,
      () => buildJwaliPaymentPdfBlob(data, summaryCards, payment, t),
      fileName,
      title,
      t,
      (error) => toast.error(getErrorMessage(error, t)),
    );
    setActiveRowPdfKey(null);
  };

  return (
    <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <div className="flex w-full min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Button asChild variant="ghost" className="px-0">
              <Link to="/yk/jwali">
                <ArrowLeft className="me-2 h-4 w-4" />
                {t("common:back_to_jwali")}
              </Link>
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold">{data.jwali.name}</h2>
                <Badge
                  variant={
                    data.ledger.summary.paymentStatus === "paid" ? "default" : "secondary"
                  }
                >
                  {t(`common:${data.ledger.summary.paymentStatus}`)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{data.jwali.phoneNo}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <LedgerPdfActionButtons
              activeAction={activePdfAction}
              onPrint={() => handlePdfAction("print")}
              onShare={() => handlePdfAction("share")}
              onDownload={() => handlePdfAction("download")}
            />
            {canEdit ? (
              <>
                <Button onClick={() => setEntryDialogOpen(true)}>
                  <PlusIcon className="me-2 h-4 w-4" />
                  {t("common:add_jwali_entry")}
                </Button>
                <Button variant="outline" onClick={() => setPaymentDialogOpen(true)}>
                  <PlusIcon className="me-2 h-4 w-4" />
                  {t("common:add_jwali_payment")}
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:phone_number")}</CardDescription>
              <CardTitle>{data.jwali.phoneNo}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="md:col-span-2 xl:col-span-2">
            <CardHeader className="pb-2">
              <CardDescription>{t("common:address")}</CardDescription>
              <CardTitle>{data.jwali.address}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:season")}</CardDescription>
              <CardTitle>{data.jwali.seasonName}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:total_bags")}</CardDescription>
              <CardTitle className="tabular-nums">
                {formatDisplayNumber(data.ledger.summary.totalBags, locale)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{balanceLabels.title}</CardTitle>
            <CardDescription>{balanceLabels.description}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {currencyBalances.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                {balanceLabels.noBalance}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>{t("common:currency")}</TableHead>
                      <TableHead className="text-end">{balanceLabels.chargeTotal}</TableHead>
                      <TableHead className="text-end">{balanceLabels.paidTotal}</TableHead>
                      <TableHead className="text-end text-amber-700">
                        {balanceLabels.weStillOwe}
                      </TableHead>
                      <TableHead className="text-end text-emerald-700">
                        {balanceLabels.owesUs}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currencyBalances.map((row) => (
                      <TableRow key={row.currencyId}>
                        <TableCell className="font-medium">
                          {formatCurrencyTitle(row.currencyCode, row.currencyName, t)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatDisplayAmount(row.totalChargeAmount, locale)} {row.currencyCode}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatDisplayAmount(row.totalPaidAmount, locale)} {row.currencyCode}
                        </TableCell>
                        <TableCell className="text-end font-medium tabular-nums text-amber-700">
                          {formatDisplayAmount(row.amountWeOweJwali, locale)} {row.currencyCode}
                        </TableCell>
                        <TableCell className="text-end font-medium tabular-nums text-emerald-700">
                          {formatDisplayAmount(row.amountJwaliOwesUs, locale)} {row.currencyCode}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("common:jwali_ledger_entries")}</CardTitle>
            <CardDescription>{t("common:jwali_ledger_entries_description")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.ledger.entries.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                {t("common:no_data")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>{t("common:date")}</TableHead>
                      <TableHead className="text-end">{t("common:bags_count")}</TableHead>
                      <TableHead className="text-end">{t("common:rate_per_bag")}</TableHead>
                      <TableHead className="text-end">{t("common:amount")}</TableHead>
                      <TableHead>{t("common:currency")}</TableHead>
                      <TableHead>{t("common:notes")}</TableHead>
                      <TableHead className="text-end">{t("common:actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.ledger.entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{dateFormatter(entry.occurredAt)}</TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatDisplayNumber(entry.bagCount, locale)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatDisplayAmount(entry.ratePerBag, locale)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatDisplayAmount(entry.amount, locale)}
                        </TableCell>
                        <TableCell>
                          {entry.currency?.code
                            ? formatCurrencyTitle(entry.currency.code, entry.currency.name, t)
                            : "—"}
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
                                  onClick={() => {
                                    const values: JwaliLedgerEntryFormValues = {
                                      bagCount: String(entry.bagCount),
                                      ratePerBag: entry.ratePerBag,
                                      currencyId: entry.currency?.id ?? entry.currencyId ?? "",
                                      occurredAt: entry.occurredAt?.slice(0, 10) ?? today,
                                      notes: entry.notes ?? "",
                                    };
                                    entryForm.reset(values);
                                    setEditingEntry({ id: entry.id, values });
                                  }}
                                  aria-label={t("common:edit")}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setDeletingTarget({ type: "entry", id: entry.id });
                                  }}
                                  aria-label={t("common:delete")}
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

        <Card>
          <CardHeader>
            <CardTitle>{t("common:jwali_payments")}</CardTitle>
            <CardDescription>{t("common:jwali_payments_description")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.ledger.payments.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                {t("common:no_data")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>{t("common:date")}</TableHead>
                      <TableHead className="text-end">{t("common:amount")}</TableHead>
                      <TableHead>{t("common:currency")}</TableHead>
                      <TableHead>{t("common:jwali_paid_via")}</TableHead>
                      <TableHead>{t("common:notes")}</TableHead>
                      <TableHead className="text-end">{t("common:actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.ledger.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{dateFormatter(payment.occurredAt)}</TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatDisplayAmount(payment.amount, locale)}
                        </TableCell>
                        <TableCell>
                          {payment.currency?.code
                            ? formatCurrencyTitle(payment.currency.code, payment.currency.name, t)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatJwaliPayment(payment, t)}
                        </TableCell>
                        <TableCell>{payment.notes || "—"}</TableCell>
                        <TableCell className="text-end">
                          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
                            {canEdit ? (
                              <>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    const values = {
                                      amount: payment.amount,
                                      paymentDate: payment.occurredAt?.slice(0, 10) ?? today,
                                      notes: payment.notes ?? "",
                                    };
                                    paymentForm.reset({
                                      amount: values.amount,
                                      paymentDate: values.paymentDate,
                                      paymentChannel: payment.paymentChannel ?? "cash",
                                      currencyId:
                                        payment.currency?.id ??
                                        payment.sarafLedgerCurrency?.id ??
                                        payment.currencyId ??
                                        payment.sarafLedgerCurrencyId ??
                                        "",
                                      sarafId: payment.sarafId ?? "",
                                      notes: values.notes ?? "",
                                    });
                                    setEditingPayment({ id: payment.id, values });
                                  }}
                                  aria-label={t("common:edit")}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setDeletingTarget({ type: "payment", id: payment.id });
                                  }}
                                  aria-label={t("common:delete")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : null}
                            <LedgerPdfRowActions
                              rowKey={payment.id}
                              activeKey={activeRowPdfKey}
                              onPrint={() => handlePaymentPdfAction(payment, "print")}
                              onShare={() => handlePaymentPdfAction(payment, "share")}
                              onDownload={() => handlePaymentPdfAction(payment, "download")}
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
        open={editingEntry !== null}
        onOpenChange={(open) => {
          if (!open) setEditingEntry(null);
        }}
        title={t("common:edit", { name: t("common:jwali_entry") })}
        description={t("common:edit", { name: t("common:jwali_entry") })}
        contentClassName="min-w-3xl"
      >
        {editingEntry ? (
          <Form {...entryForm}>
            <form
              onSubmit={entryForm.handleSubmit((values) => {
                updateLedgerEntry(
                  { entryId: editingEntry.id, values },
                  { onSuccess: () => setEditingEntry(null) },
                );
              })}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  name="bagCount"
                  label={t("common:bags_count")}
                  control={entryForm.control}
                  required
                  type="number"
                  characterRestriction="none"
                />
                <InputField
                  name="ratePerBag"
                  label={t("common:rate_per_bag")}
                  control={entryForm.control}
                  required
                  type="number"
                  characterRestriction="none"
                />
                <DatePickerField
                  name="occurredAt"
                  label={t("common:date")}
                  control={entryForm.control}
                  required
                />
                <DynamicLocalSelect
                  name="currencyId"
                  label={t("common:currency")}
                  control={entryForm.control}
                  required
                  options={currencyOptions}
                  disabled={currenciesLoading || currencyOptions.length === 0}
                  placeholder={t("common:select", { name: t("common:currency") })}
                />
                <InputField
                  name="notes"
                  label={t("common:notes")}
                  control={entryForm.control}
                  characterRestriction="none"
                  className="md:col-span-2"
                />
              </div>
              <Button type="submit" disabled={isUpdatingEntry}>
                {isUpdatingEntry
                  ? t("common:saving", { name: t("common:jwali_entry") })
                  : t("common:save", { name: t("common:jwali_entry") })}
              </Button>
            </form>
          </Form>
        ) : null}
      </CustomDialog>

      <CustomDialog
        open={editingPayment !== null}
        onOpenChange={(open) => {
          if (!open) setEditingPayment(null);
        }}
        title={t("common:edit", { name: t("common:jwali_payment") })}
        description={t("common:edit", { name: t("common:jwali_payment") })}
        contentClassName="min-w-3xl"
      >
        {editingPayment ? (
          <Form {...paymentForm}>
          <form
            onSubmit={paymentForm.handleSubmit((values) => {
              updatePayment(
                {
                  paymentId: editingPayment.id,
                  values: {
                    amount: values.amount,
                    paymentDate: values.paymentDate,
                    notes: values.notes,
                  },
                },
                { onSuccess: () => setEditingPayment(null) },
              );
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
              <InputField
                name="notes"
                label={t("common:notes")}
                control={paymentForm.control}
                characterRestriction="none"
                className="md:col-span-2"
              />
            </div>
            <Button type="submit" disabled={isUpdatingPayment}>
              {isUpdatingPayment
                ? t("common:saving", { name: t("common:jwali_payment") })
                : t("common:save", { name: t("common:jwali_payment") })}
            </Button>
          </form>
          </Form>
        ) : null}
      </CustomDialog>

      <CustomDialog
        open={deletingTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingTarget(null);
        }}
        contentClassName="max-w-md"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{t("common:confirm_delete")}</DialogTitle>
          <DialogDescription>{t("common:confirm_delete")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setDeletingTarget(null)}>
            {t("common:cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (!deletingTarget) return;
              if (deletingTarget.type === "entry") {
                deleteLedgerEntry(deletingTarget.id, {
                  onSuccess: () => setDeletingTarget(null),
                });
                return;
              }
              deletePayment(deletingTarget.id, {
                onSuccess: () => setDeletingTarget(null),
              });
            }}
          >
            {t("common:delete")}
          </Button>
        </DialogFooter>
      </CustomDialog>
      <CustomDialog
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        title={t("common:add_jwali_entry")}
        description={t("common:add_jwali_entry_description")}
        contentClassName="min-w-3xl"
      >
        <Form {...entryForm}>
          <form
            onSubmit={entryForm.handleSubmit((values) => {
              addLedgerEntry(values, {
                onSuccess: () => {
                  entryForm.reset({
                    bagCount: "",
                    ratePerBag: "",
                    currencyId: defaultCurrencyId,
                    occurredAt: today,
                    notes: "",
                  });
                  setEntryDialogOpen(false);
                },
              });
            })}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                name="bagCount"
                label={t("common:bags_count")}
                control={entryForm.control}
                required
                type="number"
                characterRestriction="none"
              />
              <InputField
                name="ratePerBag"
                label={t("common:rate_per_bag")}
                control={entryForm.control}
                required
                type="number"
                characterRestriction="none"
              />
              <DatePickerField
                name="occurredAt"
                label={t("common:date")}
                control={entryForm.control}
                required
              />
              <DynamicLocalSelect
                name="currencyId"
                label={t("common:currency")}
                control={entryForm.control}
                required
                options={currencyOptions}
                disabled={currenciesLoading || currencyOptions.length === 0}
                placeholder={t("common:select", { name: t("common:currency") })}
              />
              <InputField
                name="notes"
                label={t("common:notes")}
                control={entryForm.control}
                characterRestriction="none"
                className="md:col-span-2"
              />
            </div>

            <Button type="submit" disabled={isAddingLedgerEntry}>
              {isAddingLedgerEntry
                ? t("common:saving", { name: t("common:jwali_entry") })
                : t("common:save", { name: t("common:jwali_entry") })}
            </Button>
          </form>
        </Form>
      </CustomDialog>

      <CustomDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        title={t("common:add_jwali_payment")}
        description={t("common:add_jwali_payment_description")}
        contentClassName="min-w-3xl"
      >
        <Form {...paymentForm}>
          <form
            onSubmit={paymentForm.handleSubmit((values) => {
              addPayment(values, {
                onSuccess: () => {
                  paymentForm.reset({
                    amount: "",
                    paymentDate: today,
                    paymentChannel: "cash",
                    currencyId: defaultCurrencyId,
                    sarafId: "",
                    notes: "",
                  });
                  setPaymentDialogOpen(false);
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
              <DynamicLocalSelect
                name="paymentChannel"
                label={t("common:jwali_payment_mode")}
                control={paymentForm.control}
                required
                options={paymentRouteOptions}
                placeholder={t("common:select", { name: t("common:jwali_payment_mode") })}
              />
              <DynamicLocalSelect
                name="currencyId"
                label={t("common:currency")}
                control={paymentForm.control}
                required
                options={currencyOptions}
                disabled={currenciesLoading || currencyOptions.length === 0}
                placeholder={t("common:select", { name: t("common:currency") })}
              />
              <p className="text-sm text-muted-foreground md:col-span-2">
                {paymentChannel === "saraf"
                  ? t("common:jwali_payment_route_saraf_hint")
                  : t("common:jwali_payment_route_cash_hint")}
              </p>
              {paymentChannel === "saraf" ? (
                <DynamicLocalSelect
                  name="sarafId"
                  label={t("common:rice_sale_saraf_for_ledger")}
                  control={paymentForm.control}
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
                control={paymentForm.control}
                characterRestriction="none"
                className="md:col-span-2"
              />
            </div>

            <Button type="submit" disabled={isAddingPayment}>
              {isAddingPayment
                ? t("common:saving", { name: t("common:jwali_payment") })
                : t("common:save", { name: t("common:jwali_payment") })}
            </Button>
          </form>
        </Form>
      </CustomDialog>
    </div>
  );
}
