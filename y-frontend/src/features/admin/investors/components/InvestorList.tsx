import { useState } from "react";
import CustomDialog from "@/components/CustomDialog";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getDisplayLocale } from "@/utils/displayLocale";
import { useSeasonWriteAccess } from "../../seasons/hooks/useSeasonWriteAccess";
import {
  useCreateInvestor,
  useDeleteInvestor,
  useInvestors,
  useUpdateInvestor,
} from "../hooks";
import type { Investor, InvestorFormValues } from "../schemas/investor";
import { getInvestorColumns } from "./columns";
import { InvestorForm } from "./InvestorForm";

export function InvestorList() {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({ pageNumber: 1, pageSize: 10 });
  const [sorting, setSorting] = useState<{ sortBy: string; sortDirection: "asc" | "desc" }>({
    sortBy: "createdAt",
    sortDirection: "desc",
  });

  const { activeSeason, isLoadingActiveSeason, canCreate } = useSeasonWriteAccess();
  const { data, isLoading, isFetching, error } = useInvestors({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });
  const { mutate: createInvestor, isPending: isCreating } = useCreateInvestor();
  const { mutate: updateInvestor, isPending: isUpdating } = useUpdateInvestor();
  const { mutate: deleteInvestor } = useDeleteInvestor();

  const handleSubmit = (values: InvestorFormValues) => {
    if (editingInvestor) {
      updateInvestor(
        { id: editingInvestor.id, values },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingInvestor(null);
          },
        },
      );
      return;
    }

    createInvestor(values, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  const columns = useDataTableColumns<Investor>({
    customColumns: getInvestorColumns(t, locale),
    onEdit: (investor) => {
      setEditingInvestor(investor);
      setIsFormOpen(true);
    },
    onDelete: (investor) => deleteInvestor(investor.id),
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:investor:investors") })}
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
            <h2 className="text-lg font-bold">{t("sidebar:investor:investors")}</h2>
            <p className="text-sm text-muted-foreground">{t("common:investor_description")}</p>
          </div>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="hover:cursor-pointer"
            disabled={!canCreate || isLoadingActiveSeason}
          >
            <PlusIcon className="me-2 h-4 w-4" />
            {t("common:add", { name: t("admin:investor:investor") })}
          </Button>
        </div>

        {!activeSeason && !isLoadingActiveSeason ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            {t("common:no_active_season_investor_hint")}
          </div>
        ) : null}

        <CustomDialog
          open={isFormOpen || editingInvestor !== null}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingInvestor(null);
            }
          }}
          title={
            editingInvestor
              ? t("common:edit", { name: t("admin:investor:investor") })
              : t("common:add", { name: t("admin:investor:investor") })
          }
          contentClassName="min-w-4xl max-h-[80vh] flex flex-col"
          description={t("common:investor_form_description")}
        >
          <InvestorForm
            activeSeason={activeSeason ?? null}
            defaultValues={editingInvestor}
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
