import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { EnteringPaddyFilter } from "../types";
import type { EnteringPaddy } from "../schemas/entering-paddy";

type EnteringPaddyListApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<EnteringPaddy>;
};

export const useEnteringPaddies = (filters: EnteringPaddyFilter = {}) => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<PaginatedResponse<EnteringPaddy>>({
    queryKey: ["entering-paddies", selectedSeasonId, filters],
    queryFn: async () => {
      const response = await apiClient.get("entering_paddy", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
          seasonId: filters.seasonId || undefined,
          receivedFrom: filters.receivedFrom || undefined,
          trackedInWarehouse:
            filters.trackedInWarehouse !== undefined
              ? filters.trackedInWarehouse
              : undefined,
        },
      });

      return (response.data as EnteringPaddyListApiResponse).data;
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(selectedSeasonId),
  });
};
