import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Investor } from "../schemas/investor";

type InvestorsApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<Investor>;
};

export const useInvestors = (filters: {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  sortByAction?: "asc" | "desc";
  seasonId?: string;
  isActive?: string;
} = {}) => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<PaginatedResponse<Investor>>({
    queryKey: ["investors", selectedSeasonId, filters],
    queryFn: async () => {
      const response = await apiClient.get("investors", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
          seasonId: filters.seasonId || undefined,
          isActive: filters.isActive || undefined,
        },
      });

      return (response.data as InvestorsApiResponse).data;
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(selectedSeasonId),
  });
};
