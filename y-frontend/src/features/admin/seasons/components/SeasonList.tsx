import { useState } from "react";
import { LockIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import {
  useCloseSeason,
  useCreateSeason,
  useDeleteSeason,
  useSeasons,
  useUpdateSeason,
} from "../hooks";
import type { Season, SeasonFormValues } from "../schemas/season";
import { getSeasonColumns } from "./columns";
import { SeasonForm } from "./SeasonForm";
import CustomDialog from "@/components/CustomDialog";

export function SeasonList() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
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

  const { data, isLoading, isFetching, error } = useSeasons({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });

  const { mutate: createSeason, isPending: isCreating } = useCreateSeason();
  const { mutate: updateSeason, isPending: isUpdating } = useUpdateSeason();
  const { mutate: deleteSeason } = useDeleteSeason();
  const { mutate: closeSeason } = useCloseSeason();

  const handleSubmit = (values: SeasonFormValues) => {
    if (editingSeason) {
      updateSeason(
        { id: editingSeason.id, values },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingSeason(null);
          },
        },
      );
      return;
    }

    createSeason(values, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  const columns = useDataTableColumns<Season>({
    customColumns: getSeasonColumns(t),
    editVisible: (season) => season.status === "ACTIVE",
    onEdit: (season) => {
      if (season.status === "CLOSED") {
        return;
      }

      setEditingSeason(season);
      setIsFormOpen(true);
    },
    onDelete: (season) => {
      deleteSeason(season.id);
    },
    customActions: [
      {
        label: t("common:close", { name: t("admin:season") }),
        icon: <LockIcon className="size-4" />,
        visible: (season) => season.status === "ACTIVE",
        action: (season) => closeSeason(season.id),
      },
    ],
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", {
          name: t("sidebar:season:season"),
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
            <h2 className="text-lg font-bold">{t("sidebar:season:season")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("common:season_description")}
            </p>
          </div>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="hover:cursor-pointer"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("common:add", { name: t("admin:season") })}
          </Button>
        </div>

        <CustomDialog
          open={isFormOpen || editingSeason !== null}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingSeason(null);
            }
          }}
          title={
            editingSeason
              ? t("common:edit", { name: t("admin:season") })
              : t("common:add", { name: t("admin:season") })
          }
          contentClassName="min-w-4xl max-h-[80vh] flex flex-col"
          description={t("common:season_form_description")}
        >
          <SeasonForm
            defaultValues={editingSeason}
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
