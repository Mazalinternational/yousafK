import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import {
  useCreatePaddyWarehouse,
  useDeletePaddyWarehouse,
  usePaddyWarehouses,
  useUpdatePaddyWarehouse,
} from "../hooks";
import { useSeasonWriteAccess } from "../../seasons/hooks/useSeasonWriteAccess";
import type {
  PaddyWarehouse,
  PaddyWarehouseFormValues,
} from "../schemas/paddy-warehouse";
import { getPaddyWarehouseColumns } from "./columns";
import { PaddyWarehouseForm } from "./PaddyWarehouseForm";
import CustomDialog from "@/components/CustomDialog";

export function PaddyWarehouseList() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPaddyWarehouse, setEditingPaddyWarehouse] =
    useState<PaddyWarehouse | null>(null);
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
  const { data, isLoading, isFetching, error } = usePaddyWarehouses({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });

  const { mutate: createPaddyWarehouse, isPending: isCreating } =
    useCreatePaddyWarehouse();
  const { mutate: updatePaddyWarehouse, isPending: isUpdating } =
    useUpdatePaddyWarehouse();
  const { mutate: deletePaddyWarehouse } = useDeletePaddyWarehouse();

  const handleSubmit = (values: PaddyWarehouseFormValues) => {
    if (editingPaddyWarehouse) {
      updatePaddyWarehouse(
        { id: editingPaddyWarehouse.id, values },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingPaddyWarehouse(null);
          },
        },
      );
      return;
    }

    createPaddyWarehouse(values, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  const columns = useDataTableColumns<PaddyWarehouse>({
    customColumns: getPaddyWarehouseColumns(t),
    onEdit: (paddyWarehouse) => {
      setEditingPaddyWarehouse(paddyWarehouse);
      setIsFormOpen(true);
    },
    onDelete: (paddyWarehouse) => {
      deletePaddyWarehouse(paddyWarehouse.id);
    },
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", {
          name: t("sidebar:paddy_warehouse:company_owned"),
        })}
      />
    );
  }

  if (error) {
    return (
      <StatusIndicator statusType="error" message={t("common:error_message")} />
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <div className="flex w-full min-w-0 flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">
              {t("sidebar:paddy_warehouse:company_owned")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("common:paddy_warehouse_description")}
            </p>
          </div>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="hover:cursor-pointer"
            disabled={!canCreate || isLoadingActiveSeason}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("common:add", { name: t("admin:paddy_warehouse") })}
          </Button>
        </div>

        {!activeSeason && !isLoadingActiveSeason ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("common:no_active_season_paddy_hint")}
          </div>
        ) : null}

        <CustomDialog
          open={isFormOpen || editingPaddyWarehouse !== null}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingPaddyWarehouse(null);
            }
          }}
          title={
            editingPaddyWarehouse
              ? t("common:edit", { name: t("admin:paddy_warehouse") })
              : t("common:add", { name: t("admin:paddy_warehouse") })
          }
          contentClassName="min-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
          description={t("common:paddy_warehouse_form_description")}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <PaddyWarehouseForm
              activeSeason={activeSeason ?? null}
              defaultValues={editingPaddyWarehouse}
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
