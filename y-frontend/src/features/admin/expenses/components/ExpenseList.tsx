import { useState } from "react";
import CustomDialog from "@/components/CustomDialog";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getDisplayLocale } from "@/utils/displayLocale";
import { useSeasonWriteAccess } from "../../seasons/hooks/useSeasonWriteAccess";
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  useUpdateExpense,
} from "../hooks";
import type { Expense, ExpenseFormValues } from "../schemas/expense";
import { getExpenseColumns } from "./columns";
import { ExpenseForm } from "./ExpenseForm";

export function ExpenseList() {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({ pageNumber: 1, pageSize: 10 });
  const [sorting, setSorting] = useState<{ sortBy: string; sortDirection: "asc" | "desc" }>({
    sortBy: "createdAt",
    sortDirection: "desc",
  });

  const { activeSeason, isLoadingActiveSeason, canCreate } = useSeasonWriteAccess();
  const { data, isLoading, isFetching, error } = useExpenses({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });
  const { mutate: createExpense, isPending: isCreating } = useCreateExpense();
  const { mutate: updateExpense, isPending: isUpdating } = useUpdateExpense();
  const { mutate: deleteExpense } = useDeleteExpense();

  const handleSubmit = (values: ExpenseFormValues) => {
    if (editingExpense) {
      updateExpense(
        { id: editingExpense.id, values },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingExpense(null);
          },
        },
      );
      return;
    }

    createExpense(values, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  const columns = useDataTableColumns<Expense>({
    customColumns: getExpenseColumns(t, locale),
    onEdit: (expense) => {
      setEditingExpense(expense);
      setIsFormOpen(true);
    },
    onDelete: (expense) => deleteExpense(expense.id),
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("admin:expenses") })}
      />
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
            <h2 className="text-lg font-bold">{t("sidebar:expenses:expenses")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("common:expenses_description")}
            </p>
          </div>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="hover:cursor-pointer"
            disabled={!canCreate || isLoadingActiveSeason}
          >
            <PlusIcon className="me-2 h-4 w-4" />
            {t("common:add", { name: t("admin:expenses") })}
          </Button>
        </div>

        {!activeSeason && !isLoadingActiveSeason ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            {t("common:no_active_season_expense_hint")}
          </div>
        ) : null}

        <CustomDialog
          open={isFormOpen || editingExpense !== null}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingExpense(null);
            }
          }}
          title={
            editingExpense
              ? t("common:edit", { name: t("admin:expenses") })
              : t("common:add", { name: t("admin:expenses") })
          }
          contentClassName="min-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
          description={t("common:expense_form_description")}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <ExpenseForm
              activeSeason={activeSeason}
              defaultValues={editingExpense}
              onSubmit={handleSubmit}
              isSubmitting={isCreating || isUpdating}
            />
          </div>
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
