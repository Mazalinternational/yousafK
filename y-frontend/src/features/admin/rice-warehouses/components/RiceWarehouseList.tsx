import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import {
  useCreateRiceWarehouse,
  useDeleteRiceWarehouse,
  useRiceWarehouses,
  useUpdateRiceWarehouse,
} from "../hooks";
import { useSeasonWriteAccess } from "../../seasons/hooks/useSeasonWriteAccess";
import type {
  RiceWarehouse,
  RiceWarehouseFormValues,
} from "../schemas/rice-warehouse";
import { getRiceWarehouseColumns } from "./columns";
import { RiceWarehouseForm } from "./RiceWarehouseForm";
import CustomDialog from "@/components/CustomDialog";

export function RiceWarehouseList() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRiceWarehouse, setEditingRiceWarehouse] =
    useState<RiceWarehouse | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<{
    sortBy: string;
    sortDirection: "asc" | "desc";
  }>({
    sortBy: "createdAt",
    sortDirection: "desc",
  });

  const { activeSeason, isLoadingActiveSeason, canCreate } = useSeasonWriteAccess();
  const { data, isLoading, isFetching, error } = useRiceWarehouses({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });

  const { mutate: createRiceWarehouse, isPending: isCreating } =
    useCreateRiceWarehouse();
  const { mutate: updateRiceWarehouse, isPending: isUpdating } =
    useUpdateRiceWarehouse();
  const { mutate: deleteRiceWarehouse } = useDeleteRiceWarehouse();

  const handleSubmit = (values: RiceWarehouseFormValues) => {
    if (editingRiceWarehouse) {
      updateRiceWarehouse(
        { id: editingRiceWarehouse.id, values },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingRiceWarehouse(null);
          },
        },
      );
      return;
    }

    createRiceWarehouse(values, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  const columns = useDataTableColumns<RiceWarehouse>({
    customColumns: getRiceWarehouseColumns(t),
    onEdit: (riceWarehouse) => {
      setEditingRiceWarehouse(riceWarehouse);
      setIsFormOpen(true);
    },
    onDelete: (riceWarehouse) => {
      deleteRiceWarehouse(riceWarehouse.id);
    },
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", {
          name: t("sidebar:rice_warehouse:rice_warehouse"),
        })}
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
            <h2 className="text-lg font-bold">
              {t("sidebar:rice_warehouse:rice_warehouse")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("common:rice_warehouse_description")}
            </p>
          </div>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="hover:cursor-pointer"
            disabled={!canCreate || isLoadingActiveSeason}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("common:add", { name: t("admin:rice_warehouse") })}
          </Button>
        </div>

        {!activeSeason && !isLoadingActiveSeason ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("common:no_active_season_rice_hint")}
          </div>
        ) : null}

        <CustomDialog
          open={isFormOpen || editingRiceWarehouse !== null}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingRiceWarehouse(null);
            }
          }}
          title={
            editingRiceWarehouse
              ? t("common:edit", { name: t("admin:rice_warehouse") })
              : t("common:add", { name: t("admin:rice_warehouse") })
          }
          contentClassName="min-w-4xl max-h-[80vh] flex flex-col"
          description={t("common:rice_warehouse_form_description")}
        >
          <RiceWarehouseForm
            activeSeason={activeSeason ?? null}
            defaultValues={editingRiceWarehouse}
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
