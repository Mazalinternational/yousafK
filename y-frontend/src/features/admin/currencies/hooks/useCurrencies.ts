import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Currency } from "../schemas/currency";

type CurrenciesListApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<Currency>;
};

export const useCurrencies = (filters: {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  isActive?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  sortByAction?: "asc" | "desc";
} = {}) => {
  return useQuery<PaginatedResponse<Currency>>({
    queryKey: ["currencies", filters],
    queryFn: async () => {
      const response = await apiClient.get("currencies", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          isActive: filters.isActive || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
        },
      });

      return (response.data as CurrenciesListApiResponse).data;
    },
    placeholderData: keepPreviousData,
  });
};
