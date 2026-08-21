import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PaddyProcess } from "../schemas/paddy-process";

type PaddyProcessListApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<PaddyProcess>;
};

export const usePaddyProcesses = (filters: {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  sortByAction?: "asc" | "desc";
  seasonId?: string;
  variety?: string;
} = {}) => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<PaginatedResponse<PaddyProcess>>({
    queryKey: ["paddy-processes", selectedSeasonId, filters],
    queryFn: async () => {
      const response = await apiClient.get("paddy_process", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
          seasonId: filters.seasonId || undefined,
          variety: filters.variety || undefined,
        },
      });

      return (response.data as PaddyProcessListApiResponse).data;
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(selectedSeasonId),
  });
};
