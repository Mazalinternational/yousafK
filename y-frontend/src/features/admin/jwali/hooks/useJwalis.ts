import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Jwali } from "../schemas/jwali";

type JwaliApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<Jwali>;
};

export const useJwalis = (filters: {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  sortByAction?: "asc" | "desc";
  seasonId?: string;
} = {}) => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<PaginatedResponse<Jwali>>({
    queryKey: ["jwali", selectedSeasonId, filters],
    queryFn: async () => {
      const response = await apiClient.get("jwali", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
          seasonId: filters.seasonId || undefined,
        },
      });

      return (response.data as JwaliApiResponse).data;
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(selectedSeasonId),
  });
};
