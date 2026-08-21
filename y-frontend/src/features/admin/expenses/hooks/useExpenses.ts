import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Expense } from "../schemas/expense";

type ExpensesApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<Expense>;
};

export const useExpenses = (filters: {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  sortByAction?: "asc" | "desc";
  seasonId?: string;
  categoryId?: string;
} = {}) => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<PaginatedResponse<Expense>>({
    queryKey: ["expenses", selectedSeasonId, filters],
    queryFn: async () => {
      const response = await apiClient.get("expenses", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
          seasonId: filters.seasonId || undefined,
          categoryId: filters.categoryId || undefined,
        },
      });

      return (response.data as ExpensesApiResponse).data;
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(selectedSeasonId),
  });
};
