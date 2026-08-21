import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { StoreEntry, StoreType } from "../schemas/store";

type StoreEntriesApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<StoreEntry>;
};

export const useStores = ({
  storeType,
  ...filters
}: {
  storeType: StoreType;
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  sortByAction?: "asc" | "desc";
  seasonId?: string;
}) => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<PaginatedResponse<StoreEntry>>({
    queryKey: ["stores", storeType, selectedSeasonId, filters],
    queryFn: async () => {
      const response = await apiClient.get("stores", {
        params: {
          storeType,
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
          seasonId: filters.seasonId || selectedSeasonId || undefined,
        },
      });

      return (response.data as StoreEntriesApiResponse).data;
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(selectedSeasonId),
  });
};
