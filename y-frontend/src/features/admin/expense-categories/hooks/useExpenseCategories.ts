import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ExpenseCategory } from "../schemas/expense-category";

type ExpenseCategoriesListApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<ExpenseCategory>;
};

export const useExpenseCategories = (
  filters: {
    pageNumber?: number;
    pageSize?: number;
    query?: string;
    isActive?: string;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    sortByAction?: "asc" | "desc";
  } = {},
) => {
  return useQuery<PaginatedResponse<ExpenseCategory>>({
    queryKey: ["expense-categories", filters],
    queryFn: async () => {
      const response = await apiClient.get("expense-categories", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          isActive: filters.isActive || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
        },
      });

      return (response.data as ExpenseCategoriesListApiResponse).data;
    },
    placeholderData: keepPreviousData,
  });
};
