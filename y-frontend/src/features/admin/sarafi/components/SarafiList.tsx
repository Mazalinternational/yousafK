import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import CustomDialog from "@/components/CustomDialog";
import { useSeasonWriteAccess } from "../../seasons/hooks/useSeasonWriteAccess";
import { useCreateSaraf } from "../hooks/useCreateSaraf";
import { useDeleteSaraf } from "../hooks/useDeleteSaraf";
import { useSarafs } from "../hooks/useSarafs";
import { useUpdateSaraf } from "../hooks/useUpdateSaraf";
import type { Saraf, SarafFormValues } from "../schemas/sarafi";
import { getSarafColumns } from "./columns";
import { SarafiForm } from "./SarafiForm";

export function SarafiList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSaraf, setEditingSaraf] = useState<Saraf | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({ pageNumber: 1, pageSize: 10 });
  const [sorting, setSorting] = useState<{ sortBy: string; sortDirection: "asc" | "desc" }>({
    sortBy: "createdAt",
    sortDirection: "desc",
  });

  const { activeSeason, isLoadingActiveSeason, canCreate } = useSeasonWriteAccess();
  const { data, isLoading, isFetching, error } = useSarafs({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });
  const { mutate: createSaraf, isPending: isCreating } = useCreateSaraf();
  const { mutate: updateSaraf, isPending: isUpdating } = useUpdateSaraf();
  const { mutate: deleteSaraf } = useDeleteSaraf();

  const handleSubmit = (values: SarafFormValues) => {
    if (editingSaraf) {
      updateSaraf(
        { id: editingSaraf.id, values },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingSaraf(null);
          },
        },
      );
      return;
    }

    createSaraf(values, { onSuccess: () => setIsFormOpen(false) });
  };

  const columns = useDataTableColumns<Saraf>({
    customColumns: getSarafColumns(t),
    onEdit: (saraf) => {
      setEditingSaraf(saraf);
      setIsFormOpen(true);
    },
    editVisible: (saraf) => saraf.season?.status === "ACTIVE",
    onDelete: (saraf) => deleteSaraf(saraf.id),
    deleteVisible: (saraf) => saraf.season?.status === "ACTIVE",
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:sarafi:sarafi") })}
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
            <h2 className="text-lg font-bold">{t("sidebar:sarafi:sarafi")}</h2>
            <p className="text-sm text-muted-foreground">{t("common:sarafi_description")}</p>
          </div>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="hover:cursor-pointer"
            disabled={!canCreate || isLoadingActiveSeason}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("common:add", { name: t("admin:sarafi:saraf") })}
          </Button>
        </div>

        {!activeSeason && !isLoadingActiveSeason ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("common:no_active_season_sarafi_hint")}
          </div>
        ) : null}

        <CustomDialog
          open={isFormOpen || editingSaraf !== null}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingSaraf(null);
            }
          }}
          title={
            editingSaraf
              ? t("common:edit", { name: t("admin:sarafi:saraf") })
              : t("common:add", { name: t("admin:sarafi:saraf") })
          }
          contentClassName="min-w-4xl max-h-[80vh] flex flex-col"
          description={t("common:sarafi_form_description")}
        >
          <SarafiForm
            activeSeason={activeSeason ?? null}
            defaultValues={editingSaraf}
            onSubmit={handleSubmit}
            isSubmitting={isCreating || isUpdating}
          />
        </CustomDialog>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          onRowClick={(row) => navigate(`/yk/sarafi/${row.id}`)}
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
