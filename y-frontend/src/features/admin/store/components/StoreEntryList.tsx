import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import { useTranslation } from "react-i18next";
import { useSeasonWriteAccess } from "../../seasons/hooks/useSeasonWriteAccess";
import { useDeleteStoreEntry, useStores } from "../hooks";
import type { StoreEntry, StoreType } from "../schemas/store";
import { getStoreColumns } from "./columns";
import { StoreVarietySalesSection } from "./StoreVarietySalesSection";
import { VarietyStockPanel } from "./VarietyStockPanel";

const STORE_TITLE_KEY_MAP: Record<StoreType, string> = {
  short_green: "common:short_green",
  regection: "common:regection",
  broken_rice: "common:broken_rice",
  waste: "common:waste",
};

function StoreEntryListPage({ storeType }: { storeType: StoreType }) {
  const { t } = useTranslation();
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

  const storeTitle = t(STORE_TITLE_KEY_MAP[storeType]);
  const {
    activeSeason,
    isLoadingActiveSeason,
    canCreate,
    selectedSeasonId,
  } = useSeasonWriteAccess();
  const { data, isLoading, isFetching, error } = useStores({
    storeType,
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });
  const { mutate: deleteStoreEntry } = useDeleteStoreEntry();

  const columns = useDataTableColumns<StoreEntry>({
    customColumns: getStoreColumns(t),
    onDelete: (storeEntry) => deleteStoreEntry(storeEntry.id),
    deleteVisible: () => true,
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: storeTitle })}
      />
    );
  }

  if (error) {
    return <StatusIndicator statusType="error" message={t("common:error_message")} />;
  }

  return (
    <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <div className="flex w-full min-w-0 flex-col gap-6">
        <div>
          <h2 className="text-lg font-bold">{storeTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {t("common:store_inventory_description", { store: storeTitle })}
          </p>
        </div>

        {!activeSeason && !isLoadingActiveSeason ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("common:no_active_season_store_hint")}
          </div>
        ) : null}

        <VarietyStockPanel
          storeType={storeType}
          seasonId={selectedSeasonId}
          canWrite={canCreate}
        />

        <StoreVarietySalesSection
          storeType={storeType}
          seasonId={selectedSeasonId}
          canWrite={canCreate}
        />

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

export function ShortGreenStorePage() {
  return <StoreEntryListPage storeType="short_green" />;
}

export function RegectionStorePage() {
  return <StoreEntryListPage storeType="regection" />;
}

export function BrokenRiceStorePage() {
  return <StoreEntryListPage storeType="broken_rice" />;
}

export function WasteStorePage() {
  return <StoreEntryListPage storeType="waste" />;
}

