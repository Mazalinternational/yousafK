import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { LedgerPdfRowActions } from "@/components/LedgerPdfRowActions";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { runLedgerPdfAction } from "@/utils/ledgerPdf";
import {
  buildSarafLedgerEntryPdfBlob,
  getSarafEntryLinkedBill,
  sarafLedgerEntryPdfFileName,
  sarafLedgerEntryPdfShareTitle,
} from "../utils/sarafLedgerEntryPdf";
import type { SarafLedgerEntry } from "../schemas/sarafi";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import CustomDialog from "@/components/CustomDialog";
import { StatusIndicator } from "@/components/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { sectionVariants, staggerContainerVariants } from "@/lib/motion";
import { dateFormatter } from "@/utils/dataFormatters";
import { useCurrencies } from "../../currencies/hooks/useCurrencies";
import { useAddSarafLedgerEntry } from "../hooks/useAddSarafLedgerEntry";
import { useSarafAccount } from "../hooks/useSarafAccount";
import {
  SarafLedgerEntryFormSchema,
  type SarafLedgerEntryFormValues,
} from "../schemas/sarafi";

const today = new Date().toISOString().slice(0, 10);

function formatAmount(value: string | number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    ...options,
  }).format(Number(value));
}

export function SarafiAccountPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [activeRowPdfKey, setActiveRowPdfKey] = useState<string | null>(null);
  const { data, isLoading, error } = useSarafAccount(id);
  const { mutate: addLedgerEntry, isPending: isAddingLedgerEntry } = useAddSarafLedgerEntry(id);

  const { data: currenciesPage, isLoading: currenciesLoading } = useCurrencies({
    pageNumber: 1,
    pageSize: 100,
    isActive: "true",
    sortBy: "code",
    sortDirection: "asc",
  });

  const currencyOptions = useMemo(
    () =>
      (currenciesPage?.items ?? []).map((c) => ({
        value: c.id,
        label: `${c.code} — ${c.name}`,
      })),
    [currenciesPage?.items],
  );

  const directionOptions = useMemo(
    () => [
      { value: "in", label: t("common:cash_in") },
      { value: "out", label: t("common:cash_out") },
    ],
    [t],
  );

  const entryForm = useForm<SarafLedgerEntryFormValues>({
    resolver: zodResolver(SarafLedgerEntryFormSchema) as Resolver<SarafLedgerEntryFormValues>,
    defaultValues: {
      currencyId: "",
      direction: "in",
      amount: "",
      occurredAt: today,
      notes: "",
    },
  });

  useEffect(() => {
    const items = currenciesPage?.items ?? [];
    if (!items.length) {
      return;
    }
    const preferred = items.find((c) => c.code === "USD") ?? items[0];
    const current = entryForm.getValues("currencyId");
    if (!current && preferred) {
      entryForm.setValue("currencyId", preferred.id);
    }
  }, [currenciesPage?.items, entryForm]);

  const activeCurrencyBalances = useMemo(
    () => (data?.ledger.summary.byCurrency ?? []).filter((item) => item.entryCount > 0),
    [data?.ledger.summary.byCurrency],
  );

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("common:sarafi_account") })}
      />
    );
  }

  if (error || !data) {
    return <StatusIndicator statusType="error" message={t("common:error_message")} />;
  }

  const canEdit = data.saraf.season?.status === "ACTIVE";

  const handleEntryPdfAction = async (
    entry: SarafLedgerEntry,
    action: "download" | "share" | "print",
  ) => {
    const rowKey = entry.id;
    setActiveRowPdfKey(`${rowKey}-${action}`);
    const fileName = sarafLedgerEntryPdfFileName(data.saraf.name, entry);
    const shareTitle = sarafLedgerEntryPdfShareTitle(data.saraf.name, entry, t);

    await runLedgerPdfAction(
      action,
      () => buildSarafLedgerEntryPdfBlob(data, entry, t),
      fileName,
      shareTitle,
      t,
      (error) => toast.error(getErrorMessage(error, t)),
    );
    setActiveRowPdfKey(null);
  };

  return (
    <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <motion.div
        className="flex w-full min-w-0 flex-col gap-6"
        initial="initial"
        animate="animate"
        variants={staggerContainerVariants}
      >
        <motion.div
          variants={sectionVariants}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div className="flex flex-col gap-2">
            <Button asChild variant="ghost" className="w-fit px-0">
              <Link to="/yk/sarafi">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("common:back_to_sarafi")}
              </Link>
            </Button>
            <div>
              <h2 className="text-lg font-bold">{data.saraf.name}</h2>
              <p className="text-sm text-muted-foreground">
                {data.saraf.phoneNo}
                <span className="mx-2">·</span>
                {data.saraf.address}
              </p>
            </div>
          </div>

          {canEdit ? (
            <Button onClick={() => setEntryDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              {t("common:add_sarafi_cash_entry")}
            </Button>
          ) : null}
        </motion.div>

        {data.saraf.season ? (
          <motion.div variants={sectionVariants}>
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3">
                  <span>{data.saraf.seasonName}</span>
                  <Badge variant={data.saraf.season.status === "ACTIVE" ? "default" : "secondary"}>
                    {t(`common:${data.saraf.season.status === "ACTIVE" ? "active" : "closed"}`)}
                  </Badge>
                </CardTitle>
                <CardDescription>{t("common:sarafi_account")}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ) : null}

        <motion.div variants={sectionVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("common:entries")}</CardDescription>
              <CardTitle className="text-2xl">{data.ledger.summary.entryCount}</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <h3 className="mb-3 text-sm font-medium">{t("common:sarafi_currency_breakdown")}</h3>
          {activeCurrencyBalances.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              {t("common:no_data")}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                        <th className="px-4 py-3 font-medium">{t("common:currency")}</th>
                        <th className="px-4 py-3 font-medium">{t("common:entries")}</th>
                        <th className="px-4 py-3 font-medium">{t("common:total_amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCurrencyBalances.map((item) => {
                        const balance = Number(item.totalAmount);
                        const isNegative = !Number.isNaN(balance) && balance < 0;

                        return (
                          <tr key={item.currencyId} className="border-b last:border-b-0">
                            <td className="px-4 py-3 font-medium">
                              {item.currencyCode}
                              <span className="ml-2 text-muted-foreground">({item.currencyName})</span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{item.entryCount}</td>
                            <td
                              className={`px-4 py-3 font-semibold ${
                                isNegative ? "text-destructive" : "text-emerald-700"
                              }`}
                            >
                              {formatAmount(item.totalAmount)} {item.currencyCode}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {activeCurrencyBalances.length > 0 ? (
          <motion.div variants={sectionVariants} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeCurrencyBalances.map((item) => {
              const balance = Number(item.totalAmount);
              const isNegative = !Number.isNaN(balance) && balance < 0;

              return (
                <Card key={item.currencyId} className="border-l-4 border-l-emerald-500">
                  <CardHeader className="pb-2">
                    <CardDescription>
                      {item.currencyName} ({item.currencyCode})
                    </CardDescription>
                    <CardTitle className="text-xl">{t("common:sarafi_balance_for_currency", { currency: item.currencyCode })}</CardTitle>
                    <p
                      className={`text-2xl font-bold tracking-tight ${
                        isNegative ? "text-destructive" : ""
                      }`}
                    >
                      {formatAmount(item.totalAmount)}{" "}
                      <span className="text-base font-semibold text-muted-foreground">
                        {item.currencyCode}
                      </span>
                    </p>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                      <span>{t("common:entries")}</span>
                      <span className="font-medium">{item.entryCount}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        ) : null}

        <motion.div variants={sectionVariants}>
          <Card>
            <CardHeader>
              <CardTitle>{t("common:sarafi_ledger_entries")}</CardTitle>
              <CardDescription>{t("common:sarafi_ledger_entries_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">{t("common:date")}</th>
                      <th className="px-3 py-2 font-medium">{t("common:currency")}</th>
                      <th className="px-3 py-2 font-medium">{t("common:amount")}</th>
                      <th className="px-3 py-2 font-medium">{t("common:sarafi_ledger_linked_bill")}</th>
                      <th className="px-3 py-2 font-medium">{t("common:notes")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("common:actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ledger.entries.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                          {t("common:no_data")}
                        </td>
                      </tr>
                    ) : (
                      data.ledger.entries.map((entry) => (
                        <tr key={entry.id} className="border-b last:border-b-0">
                          <td className="px-3 py-3">{dateFormatter(entry.occurredAt)}</td>
                          <td className="px-3 py-3">
                            <span className="font-medium">{entry.currencyCode}</span>
                            <span className="ml-2 text-muted-foreground">{entry.currencyName}</span>
                          </td>
                          <td
                            className={`px-3 py-3 font-medium ${
                              Number(entry.amount) < 0
                                ? "text-destructive"
                                : "text-emerald-700"
                            }`}
                          >
                            {formatAmount(entry.amount)} {entry.currencyCode}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {getSarafEntryLinkedBill(entry, t)}
                          </td>
                          <td className="px-3 py-3">{entry.notes || "—"}</td>
                          <td className="px-3 py-3 text-right">
                            <LedgerPdfRowActions
                              rowKey={entry.id}
                              activeKey={activeRowPdfKey}
                              onPrint={() => handleEntryPdfAction(entry, "print")}
                              onShare={() => handleEntryPdfAction(entry, "share")}
                              onDownload={() => handleEntryPdfAction(entry, "download")}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <CustomDialog
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        title={t("common:add_sarafi_cash_entry")}
        description={t("common:add_sarafi_cash_entry_description")}
        contentClassName="min-w-3xl"
      >
        <Form {...entryForm}>
          <form
            onSubmit={entryForm.handleSubmit((values) => {
              addLedgerEntry(values, {
                onSuccess: () => {
                  entryForm.reset({
                    currencyId: entryForm.getValues("currencyId"),
                    direction: "in",
                    amount: "",
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
              <DynamicLocalSelect
                name="currencyId"
                label={t("common:currency")}
                control={entryForm.control}
                required
                options={currencyOptions}
                disabled={currenciesLoading || currencyOptions.length === 0}
                placeholder={t("common:select", { name: t("common:currency") })}
              />
              <DynamicLocalSelect
                name="direction"
                label={t("common:cash_direction")}
                control={entryForm.control}
                required
                options={directionOptions}
              />
              <InputField
                name="amount"
                label={t("common:amount")}
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
              <InputField
                name="notes"
                label={t("common:notes")}
                control={entryForm.control}
                characterRestriction="none"
              />
            </div>

            <Button
              type="submit"
              disabled={isAddingLedgerEntry || currenciesLoading || currencyOptions.length === 0}
            >
              {isAddingLedgerEntry
                ? t("common:saving", { name: t("common:sarafi_cash_entry") })
                : t("common:save", { name: t("common:sarafi_cash_entry") })}
            </Button>
          </form>
        </Form>
      </CustomDialog>
    </div>
  );
}
