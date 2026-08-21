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
import { useCreateJwali } from "../hooks/useCreateJwali";
import { useDeleteJwali } from "../hooks/useDeleteJwali";
import { useJwalis } from "../hooks/useJwalis";
import { useUpdateJwali } from "../hooks/useUpdateJwali";
import type { Jwali, JwaliFormValues } from "../schemas/jwali";
import { getJwaliColumns } from "./columns";
import { JwaliForm } from "./JwaliForm";

export function JwaliList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJwali, setEditingJwali] = useState<Jwali | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({ pageNumber: 1, pageSize: 10 });
  const [sorting, setSorting] = useState<{ sortBy: string; sortDirection: "asc" | "desc" }>({
    sortBy: "createdAt",
    sortDirection: "desc",
  });

  const { activeSeason, isLoadingActiveSeason, canCreate } = useSeasonWriteAccess();
  const { data, isLoading, isFetching, error } = useJwalis({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });
  const { mutate: createJwali, isPending: isCreating } = useCreateJwali();
  const { mutate: updateJwali, isPending: isUpdating } = useUpdateJwali();
  const { mutate: deleteJwali } = useDeleteJwali();

  const handleSubmit = (values: JwaliFormValues) => {
    if (editingJwali) {
      updateJwali(
        { id: editingJwali.id, values },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingJwali(null);
          },
        },
      );
      return;
    }

    createJwali(values, { onSuccess: () => setIsFormOpen(false) });
  };

  const columns = useDataTableColumns<Jwali>({
    customColumns: getJwaliColumns(t),
    onEdit: (jwali) => {
      setEditingJwali(jwali);
      setIsFormOpen(true);
    },
    editVisible: (jwali) => jwali.season?.status === "ACTIVE",
    onDelete: (jwali) => deleteJwali(jwali.id),
    deleteVisible: (jwali) => jwali.season?.status === "ACTIVE",
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:jwali:jwali") })}
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
            <h2 className="text-lg font-bold">{t("sidebar:jwali:jwali")}</h2>
            <p className="text-sm text-muted-foreground">{t("common:jwali_description")}</p>
          </div>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="hover:cursor-pointer"
            disabled={!canCreate || isLoadingActiveSeason}
          >
            <PlusIcon className="me-2 h-4 w-4" />
            {t("common:add", { name: t("admin:jwali:jwali") })}
          </Button>
        </div>

        {!activeSeason && !isLoadingActiveSeason ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            {t("common:no_active_season_jwali_hint")}
          </div>
        ) : null}

        <CustomDialog
          open={isFormOpen || editingJwali !== null}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingJwali(null);
            }
          }}
          title={
            editingJwali
              ? t("common:edit", { name: t("admin:jwali:jwali") })
              : t("common:add", { name: t("admin:jwali:jwali") })
          }
          contentClassName="min-w-4xl max-h-[80vh] flex flex-col"
          description={t("common:jwali_form_description")}
        >
          <JwaliForm
            activeSeason={activeSeason ?? null}
            defaultValues={editingJwali}
            onSubmit={handleSubmit}
            isSubmitting={isCreating || isUpdating}
          />
        </CustomDialog>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          onRowClick={(row) => navigate(`/yk/jwali/${row.id}`)}
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
