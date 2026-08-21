import { apiClient } from "@/api/client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PaginatedResponse } from "@/types";
import type { Season } from "../schemas/season";
import type { SeasonsFilter } from "../types";

type SeasonListApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<Season>;
};

export const useSeasons = (filters: SeasonsFilter = {}) => {
  return useQuery<PaginatedResponse<Season>>({
    queryKey: ["seasons", filters],
    queryFn: async () => {
      const response = await apiClient.get("seasons", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
          status: filters.status || undefined,
        },
      });

      return (response.data as SeasonListApiResponse).data;
    },
    placeholderData: keepPreviousData,
  });
};
