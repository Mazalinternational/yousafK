import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import {
  useCreateFarmerOwnedPaddyWarehouse,
  useDeleteFarmerOwnedPaddyWarehouse,
  useFarmerOwnedPaddyWarehouses,
  useUpdateFarmerOwnedPaddyWarehouse,
} from "../hooks";
import { useSeasonWriteAccess } from "../../seasons/hooks/useSeasonWriteAccess";
import type {
  FarmerOwnedPaddyWarehouse,
  FarmerOwnedPaddyWarehouseFormValues,
} from "../schemas/farmer-owned-paddy-warehouse";
import { getFarmerOwnedPaddyWarehouseColumns } from "./farmer-columns";
import { FarmerOwnedPaddyWarehouseForm } from "./FarmerOwnedPaddyWarehouseForm";
import CustomDialog from "@/components/CustomDialog";

export function FarmerOwnedPaddyWarehouseList() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FarmerOwnedPaddyWarehouse | null>(null);
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
  const { data, isLoading, isFetching, error } = useFarmerOwnedPaddyWarehouses({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });

  const { mutate: createItem, isPending: isCreating } =
    useCreateFarmerOwnedPaddyWarehouse();
  const { mutate: updateItem, isPending: isUpdating } =
    useUpdateFarmerOwnedPaddyWarehouse();
  const { mutate: deleteItem } = useDeleteFarmerOwnedPaddyWarehouse();

  const handleSubmit = (values: FarmerOwnedPaddyWarehouseFormValues) => {
    if (editingItem) {
      updateItem(
        { id: editingItem.id, values },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingItem(null);
          },
        },
      );
      return;
    }

    createItem(values, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  const columns = useDataTableColumns<FarmerOwnedPaddyWarehouse>({
    customColumns: getFarmerOwnedPaddyWarehouseColumns(t),
    onEdit: (item) => {
      setEditingItem(item);
      setIsFormOpen(true);
    },
    onDelete: (item) => {
      deleteItem(item.id);
    },
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", {
          name: t("sidebar:paddy_warehouse:farmer_owned"),
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
              {t("sidebar:paddy_warehouse:farmer_owned")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("common:farmer_owned_paddy_description")}
            </p>
          </div>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="hover:cursor-pointer"
            disabled={!canCreate || isLoadingActiveSeason}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("common:add", { name: t("admin:farmer_owned_paddy_warehouse") })}
          </Button>
        </div>

        {!activeSeason && !isLoadingActiveSeason ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("common:no_active_season_farmer_paddy_hint")}
          </div>
        ) : null}

        <CustomDialog
          open={isFormOpen || editingItem !== null}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingItem(null);
            }
          }}
          title={
            editingItem
              ? t("common:edit", { name: t("admin:farmer_owned_paddy_warehouse") })
              : t("common:add", { name: t("admin:farmer_owned_paddy_warehouse") })
          }
          contentClassName="min-w-4xl max-h-[80vh] flex flex-col overflow-hidden"
          description={t("common:farmer_owned_paddy_form_description")}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <FarmerOwnedPaddyWarehouseForm
              activeSeason={activeSeason ?? null}
              defaultValues={editingItem}
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
