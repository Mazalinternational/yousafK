import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import CustomDialog from "@/components/CustomDialog";
import { DataTable } from "@/components/data-table";
import { LedgerPdfRowActions } from "@/components/LedgerPdfRowActions";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { runLedgerPdfAction } from "@/utils/ledgerPdf";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDisplayAmount, getDisplayLocale } from "@/utils/displayLocale";
import { toast } from "sonner";
import { useSeasonWriteAccess } from "../../seasons/hooks/useSeasonWriteAccess";
import {
  useCashTransactions,
  useCreateCashTransaction,
  useDeleteCashTransaction,
  useUpdateCashTransaction,
} from "../hooks";
import type { CashTransaction, CashTransactionFormValues } from "../schemas/cash";
import {
  buildCashTransactionPdfBlob,
  cashTransactionPdfFileName,
} from "../utils/cashTransactionPdf";
import { getCashTransactionColumns } from "./columns";
import { CashTransactionForm } from "./CashTransactionForm";

export function CashTransactionList() {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<CashTransaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({ pageNumber: 1, pageSize: 10 });
  const [sorting, setSorting] = useState<{ sortBy: string; sortDirection: "asc" | "desc" }>({
    sortBy: "occurredAt",
    sortDirection: "desc",
  });
  const [activeRowPdfKey, setActiveRowPdfKey] = useState<string | null>(null);

  const {
    activeSeason,
    isLoadingActiveSeason,
    canCreate,
    selectedSeasonId,
  } = useSeasonWriteAccess();
  const { data, isLoading, isFetching, error } = useCashTransactions({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });

  const { mutate: createTransaction, isPending: isCreating } = useCreateCashTransaction();
  const { mutate: updateTransaction, isPending: isUpdating } = useUpdateCashTransaction();
  const { mutate: deleteTransaction } = useDeleteCashTransaction();

  const handleSubmit = (values: CashTransactionFormValues) => {
    if (editing) {
      updateTransaction(
        { id: editing.id, values },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditing(null);
          },
        },
      );
      return;
    }

    createTransaction(values, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  const handleTransactionPdfAction = useCallback(
    async (transaction: CashTransaction, action: "download" | "share" | "print") => {
      const rowKey = transaction.id;
      setActiveRowPdfKey(`${rowKey}-${action}`);
      const fileName = cashTransactionPdfFileName(transaction);
      const directionLabel =
        transaction.direction === "in" ? t("common:cash_in") : t("common:cash_out");
      const shareTitle = `${directionLabel} — ${formatDisplayAmount(transaction.amount, locale)} ${transaction.currencyCode}`;

      await runLedgerPdfAction(
        action,
        () => buildCashTransactionPdfBlob(transaction, t),
        fileName,
        shareTitle,
        t,
        (error) => toast.error(getErrorMessage(error, t)),
      );
      setActiveRowPdfKey(null);
    },
    [locale, t],
  );

  const pdfActionsColumn = useMemo<ColumnDef<CashTransaction>>(
    () => ({
      id: "pdfActions",
      header: () => <span className="sr-only">{t("common:actions")}</span>,
      cell: ({ row }) => (
        <LedgerPdfRowActions
          rowKey={row.original.id}
          activeKey={activeRowPdfKey}
          onPrint={() => handleTransactionPdfAction(row.original, "print")}
          onShare={() => handleTransactionPdfAction(row.original, "share")}
          onDownload={() => handleTransactionPdfAction(row.original, "download")}
        />
      ),
    }),
    [activeRowPdfKey, handleTransactionPdfAction, t],
  );

  const columns = useDataTableColumns<CashTransaction>({
    customColumns: [...getCashTransactionColumns(t, locale), pdfActionsColumn],
    onEdit: (row) => {
      setEditing(row);
      setIsFormOpen(true);
    },
    onDelete: (row) => deleteTransaction(row.id),
  });

  if (isLoadingActiveSeason || isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:cash:records") })}
      />
    );
  }

  if (!selectedSeasonId) {
    return (
      <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          {t("common:no_active_season_cash_hint")}
        </div>
      </div>
    );
  }

  if (error) {
    return <StatusIndicator statusType="error" message={t("common:error_message")} />;
  }

  return (
    <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <div className="flex w-full min-w-0 flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">{t("sidebar:cash:records")}</h2>
            <p className="text-sm text-muted-foreground">{t("common:cash_records_description")}</p>
          </div>

          <Button
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
            className="hover:cursor-pointer"
            disabled={!canCreate || isLoadingActiveSeason}
          >
            <PlusIcon className="me-2 h-4 w-4" />
            {t("common:add", { name: t("admin:cash_transaction") })}
          </Button>
        </div>

        <CustomDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditing(null);
            }
          }}
          title={
            editing
              ? t("common:edit", { name: t("admin:cash_transaction") })
              : t("common:add", { name: t("admin:cash_transaction") })
          }
          contentClassName="min-w-2xl max-h-[80vh] flex flex-col"
          description={t("common:cash_form_description")}
        >
          <CashTransactionForm
            activeSeason={activeSeason}
            defaultValues={editing}
            onSubmit={handleSubmit}
            isSubmitting={isCreating || isUpdating}
          />
        </CustomDialog>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          onSearch={(search) => {
            setSearchTerm(search);
            setPagination((prev) => ({ ...prev, pageNumber: 1 }));
          }}
          pagination={pagination}
          sorting={sorting}
          onSortingChange={setSorting}
          onPaginationChange={setPagination}
          pageCount={data?.totalPages}
          totalCount={data?.totalCount ?? 0}
          isLoading={isFetching}
        />
      </div>
    </div>
  );
}
