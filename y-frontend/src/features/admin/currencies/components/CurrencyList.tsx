import { useState } from "react";
import CustomDialog from "@/components/CustomDialog";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useCreateCurrency,
  useCurrencies,
  useDeleteCurrency,
  useUpdateCurrency,
} from "../hooks";
import type { Currency, CurrencyCreateFormValues, CurrencyUpdateFormValues } from "../schemas/currency";
import { getCurrencyColumns } from "./columns";
import { CurrencyCreateForm, CurrencyEditForm } from "./CurrencyForm";

export function CurrencyList() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({ pageNumber: 1, pageSize: 10 });
  const [sorting, setSorting] = useState<{ sortBy: string; sortDirection: "asc" | "desc" }>({
    sortBy: "code",
    sortDirection: "asc",
  });

  const { data, isLoading, isFetching, error } = useCurrencies({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });

  const { mutate: createCurrency, isPending: isCreating } = useCreateCurrency();
  const { mutate: updateCurrency, isPending: isUpdating } = useUpdateCurrency();
  const { mutate: deleteCurrency } = useDeleteCurrency();

  const handleCreateSubmit = (values: CurrencyCreateFormValues) => {
    createCurrency(values, { onSuccess: () => setIsFormOpen(false) });
  };

  const handleUpdateSubmit = (values: CurrencyUpdateFormValues) => {
    if (!editingCurrency) {
      return;
    }

    updateCurrency(
      { id: editingCurrency.id, values },
      {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditingCurrency(null);
        },
      },
    );
  };

  const columns = useDataTableColumns<Currency>({
    customColumns: getCurrencyColumns(t),
    onEdit: (currency) => {
      setEditingCurrency(currency);
      setIsFormOpen(true);
    },
    onDelete: (currency) => deleteCurrency(currency.id),
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:currency:currencies") })}
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
            <h2 className="text-lg font-bold">{t("sidebar:currency:currencies")}</h2>
            <p className="text-sm text-muted-foreground">{t("common:currencies_description")}</p>
          </div>

          <Button
            onClick={() => {
              setEditingCurrency(null);
              setIsFormOpen(true);
            }}
            className="hover:cursor-pointer"
          >
            <PlusIcon className="me-2 h-4 w-4" />
            {t("common:add", { name: t("admin:currency") })}
          </Button>
        </div>

        <CustomDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingCurrency(null);
            }
          }}
          title={
            editingCurrency
              ? t("common:edit", { name: t("admin:currency") })
              : t("common:add", { name: t("admin:currency") })
          }
          contentClassName="min-w-2xl max-h-[80vh] flex flex-col"
          description={t("common:currencies_form_description")}
        >
          {editingCurrency ? (
            <CurrencyEditForm
              currency={editingCurrency}
              onSubmit={handleUpdateSubmit}
              isSubmitting={isUpdating}
            />
          ) : (
            <CurrencyCreateForm onSubmit={handleCreateSubmit} isSubmitting={isCreating} />
          )}
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
