import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomDialog from "@/components/CustomDialog";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSeasonWriteAccess } from "../../seasons/hooks/useSeasonWriteAccess";
import {
  useCreateRiceSale,
  useDeleteRiceSale,
  useRiceSales,
  useUpdateRiceSale,
} from "../hooks";
import type { RiceSale, RiceSaleFormValues } from "../schemas/rice-sale";
import { getRiceSaleColumns } from "./columns";
import { RiceSaleForm } from "./RiceSaleForm";

export function RiceSaleList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<RiceSale | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({ pageNumber: 1, pageSize: 10 });
  const [sorting, setSorting] = useState<{ sortBy: string; sortDirection: "asc" | "desc" }>({
    sortBy: "createdAt",
    sortDirection: "desc",
  });

  const { activeSeason, isLoadingActiveSeason, canCreate } = useSeasonWriteAccess();
  const { data, isLoading, isFetching, error } = useRiceSales({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });
  const { mutate: createRiceSale, isPending: isCreating } = useCreateRiceSale();
  const { mutate: updateRiceSale, isPending: isUpdating } = useUpdateRiceSale();
  const { mutate: deleteRiceSale } = useDeleteRiceSale();

  const handleSubmit = (values: RiceSaleFormValues) => {
    if (editingSale) {
      updateRiceSale(
        { id: editingSale.id, values },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingSale(null);
          },
        },
      );
      return;
    }

    createRiceSale(values, { onSuccess: () => setIsFormOpen(false) });
  };

  const columns = useDataTableColumns<RiceSale>({
    customColumns: getRiceSaleColumns(t),
    onEdit: (sale) => {
      setEditingSale(sale);
      setIsFormOpen(true);
    },
    onDelete: (sale) => {
      deleteRiceSale(sale.id);
    },
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("admin:rice_sale") })}
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
            <h2 className="text-lg font-bold">{t("sidebar:rice_warehouse:rice_sales")}</h2>
            <p className="text-sm text-muted-foreground">{t("common:rice_sales_description")}</p>
          </div>

          <Button
            onClick={() => {
              setEditingSale(null);
              setIsFormOpen(true);
            }}
            className="hover:cursor-pointer"
            disabled={!canCreate || isLoadingActiveSeason}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("common:add", { name: t("admin:rice_sale") })}
          </Button>
        </div>

        {!activeSeason && !isLoadingActiveSeason ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("common:no_active_season_rice_sales_hint")}
          </div>
        ) : null}

        <CustomDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingSale(null);
            }
          }}
          title={
            editingSale
              ? t("common:edit", { name: t("admin:rice_sale") })
              : t("common:add", { name: t("admin:rice_sale") })
          }
          contentClassName="min-w-5xl max-w-7xl w-[min(98vw,80rem)] max-h-[90vh] flex flex-col overflow-y-auto"
          description={t("common:rice_sales_form_description")}
        >
          <RiceSaleForm
            activeSeason={activeSeason ?? null}
            initialSale={editingSale}
            onSubmit={handleSubmit}
            isSubmitting={isCreating || isUpdating}
          />
        </CustomDialog>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          onRowClick={(row) => navigate(`/yk/customers/${row.buyerCustomerId}`)}
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
