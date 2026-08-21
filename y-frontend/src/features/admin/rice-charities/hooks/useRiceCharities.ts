import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { RiceCharity } from "../schemas/rice-charity";

type RiceCharitiesListApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<RiceCharity>;
};

export const useRiceCharities = (
  filters: {
    pageNumber?: number;
    pageSize?: number;
    query?: string;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    sortByAction?: "asc" | "desc";
    seasonId?: string;
  } = {},
) => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<PaginatedResponse<RiceCharity>>({
    queryKey: ["rice-charities", selectedSeasonId, filters],
    queryFn: async () => {
      const response = await apiClient.get("rice_charities", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
          seasonId: filters.seasonId || undefined,
        },
      });

      return (response.data as RiceCharitiesListApiResponse).data;
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(selectedSeasonId),
  });
};
