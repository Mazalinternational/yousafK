import { useState } from "react";
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
  useCreateRiceCharity,
  useDeleteRiceCharity,
  useRiceCharities,
  useUpdateRiceCharity,
} from "../hooks";
import type { RiceCharity, RiceCharityFormValues } from "../schemas/rice-charity";
import { getRiceCharityColumns } from "./columns";
import { RiceCharityForm } from "./RiceCharityForm";

export function RiceCharityList() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCharity, setEditingCharity] = useState<RiceCharity | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({ pageNumber: 1, pageSize: 10 });
  const [sorting, setSorting] = useState<{ sortBy: string; sortDirection: "asc" | "desc" }>({
    sortBy: "createdAt",
    sortDirection: "desc",
  });

  const { activeSeason, isLoadingActiveSeason, canCreate } = useSeasonWriteAccess();
  const { data, isLoading, isFetching, error } = useRiceCharities({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });
  const { mutate: createRiceCharity, isPending: isCreating } = useCreateRiceCharity();
  const { mutate: updateRiceCharity, isPending: isUpdating } = useUpdateRiceCharity();
  const { mutate: deleteRiceCharity } = useDeleteRiceCharity();

  const handleSubmit = (values: RiceCharityFormValues) => {
    if (editingCharity) {
      updateRiceCharity(
        { id: editingCharity.id, values },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingCharity(null);
          },
        },
      );
      return;
    }

    createRiceCharity(values, { onSuccess: () => setIsFormOpen(false) });
  };

  const columns = useDataTableColumns<RiceCharity>({
    customColumns: getRiceCharityColumns(t),
    onEdit: (charity) => {
      setEditingCharity(charity);
      setIsFormOpen(true);
    },
    onDelete: (charity) => {
      deleteRiceCharity(charity.id);
    },
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("admin:rice_charity") })}
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
            <h2 className="text-lg font-bold">{t("sidebar:rice_warehouse:rice_charity")}</h2>
            <p className="text-sm text-muted-foreground">{t("common:rice_charity_description")}</p>
          </div>

          <Button
            onClick={() => {
              setEditingCharity(null);
              setIsFormOpen(true);
            }}
            className="hover:cursor-pointer"
            disabled={!canCreate || isLoadingActiveSeason}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("common:add", { name: t("admin:rice_charity") })}
          </Button>
        </div>

        {!activeSeason && !isLoadingActiveSeason ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("common:no_active_season_rice_charity_hint")}
          </div>
        ) : activeSeason ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            {t("common:rice_charity_season_hint")}
          </div>
        ) : null}

        <CustomDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingCharity(null);
            }
          }}
          title={
            editingCharity
              ? t("common:edit", { name: t("admin:rice_charity") })
              : t("common:add", { name: t("admin:rice_charity") })
          }
          contentClassName="min-w-3xl max-w-5xl w-[min(98vw,48rem)] max-h-[90vh] flex flex-col overflow-y-auto"
          description={t("common:rice_charity_form_description")}
        >
          <RiceCharityForm
            activeSeason={activeSeason ?? null}
            initialCharity={editingCharity}
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
