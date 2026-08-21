import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import CustomDialog from "@/components/CustomDialog";
import { useSeasonWriteAccess } from "../../seasons/hooks/useSeasonWriteAccess";
import { useCreateEnteringPaddy } from "../hooks/useCreateEnteringPaddy";
import { useDeleteEnteringPaddy } from "../hooks/useDeleteEnteringPaddy";
import { useEnteringPaddies } from "../hooks/useEnteringPaddies";
import { useUpdateEnteringPaddy } from "../hooks/useUpdateEnteringPaddy";
import { useCustomers } from "../../customer/hooks/useCustomers";
import type {
  EnteringPaddy,
  EnteringPaddyFormValues,
} from "../schemas/entering-paddy";
import { getEnteringPaddyColumns } from "./columns";
import { EnteringPaddyForm } from "./EnteringPaddyForm";

export function EnteringPaddyList() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEnteringPaddy, setEditingEnteringPaddy] =
    useState<EnteringPaddy | null>(null);
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

  const {
    activeSeason,
    isLoadingActiveSeason,
    canCreate,
    selectedSeasonId,
  } = useSeasonWriteAccess();
  const { data: customersData, isLoading: isLoadingCustomers } = useCustomers({
    pageNumber: 1,
    pageSize: 1000,
    seasonId: selectedSeasonId ?? undefined,
    sortBy: "name",
    sortByAction: "asc",
  });
  const { data, isLoading, isFetching, error } = useEnteringPaddies({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });
  const customers = customersData?.items ?? [];
  const hasCustomers = customers.length > 0;
  const canManageEnteringPaddy = canCreate && hasCustomers;

  const { mutate: createEnteringPaddy, isPending: isCreating } =
    useCreateEnteringPaddy();
  const { mutate: updateEnteringPaddy, isPending: isUpdating } =
    useUpdateEnteringPaddy();
  const { mutate: deleteEnteringPaddy } = useDeleteEnteringPaddy();

  const handleSubmit = (values: EnteringPaddyFormValues) => {
    if (editingEnteringPaddy) {
      updateEnteringPaddy(
        { id: editingEnteringPaddy.id, values },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingEnteringPaddy(null);
          },
        },
      );
      return;
    }

    createEnteringPaddy(values, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  const columns = useDataTableColumns<EnteringPaddy>({
    customColumns: getEnteringPaddyColumns(t),
    onEdit: (enteringPaddy) => {
      setEditingEnteringPaddy(enteringPaddy);
      setIsFormOpen(true);
    },
    editVisible: (enteringPaddy) => enteringPaddy.season.status === "ACTIVE",
    onDelete: (enteringPaddy) => {
      deleteEnteringPaddy(enteringPaddy.id);
    },
    deleteVisible: (enteringPaddy) => enteringPaddy.season.status === "ACTIVE",
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", {
          name: t("sidebar:entering_paddy:records"),
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
              {t("sidebar:entering_paddy:records")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("common:entering_paddy_description")}
            </p>
          </div>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="hover:cursor-pointer"
            disabled={!canManageEnteringPaddy || isLoadingActiveSeason || isLoadingCustomers}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("common:add", { name: t("admin:entering_paddy") })}
          </Button>
        </div>

        {!activeSeason && !isLoadingActiveSeason ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("common:no_active_season_entering_paddy_hint")}
          </div>
        ) : null}

        {activeSeason && !isLoadingCustomers && !hasCustomers ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("common:no_customer_entering_paddy_hint")}
          </div>
        ) : null}

        <CustomDialog
          open={isFormOpen || editingEnteringPaddy !== null}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingEnteringPaddy(null);
            }
          }}
          title={
            editingEnteringPaddy
              ? t("common:edit", { name: t("admin:entering_paddy") })
              : t("common:add", { name: t("admin:entering_paddy") })
          }
          contentClassName="min-w-4xl max-h-[80vh] flex flex-col"
          description={t("common:entering_paddy_form_description")}
        >
          <EnteringPaddyForm
            activeSeason={activeSeason ?? null}
            customers={customers}
            defaultValues={editingEnteringPaddy}
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
