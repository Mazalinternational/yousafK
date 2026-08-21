import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import type { CashTransaction } from "../schemas/cash";

type CashTransactionsApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<CashTransaction>;
};

export const useCashTransactions = (
  filters: {
    pageNumber?: number;
    pageSize?: number;
    query?: string;
    currencyId?: string;
    direction?: string;
    seasonId?: string;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    sortByAction?: "asc" | "desc";
  } = {},
) => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<PaginatedResponse<CashTransaction>>({
    queryKey: ["cash", "transactions", selectedSeasonId, filters],
    queryFn: async () => {
      const response = await apiClient.get("cash/transactions", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          currencyId: filters.currencyId || undefined,
          direction: filters.direction || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
        },
      });

      return (response.data as CashTransactionsApiResponse).data;
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(selectedSeasonId),
  });
};
