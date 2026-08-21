import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { CustomersFilter } from "../types";
import type { Customer } from "../schemas/customer";

type CustomerListApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<Customer>;
};

export const useCustomers = (filters: CustomersFilter = {}) => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<PaginatedResponse<Customer>>({
    queryKey: ["customers", selectedSeasonId, filters],
    queryFn: async () => {
      const response = await apiClient.get("customers", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          type: filters.type || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
          seasonId: filters.seasonId || undefined,
        },
      });

      return (response.data as CustomerListApiResponse).data;
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(selectedSeasonId),
  });
};
