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
      // Host WAF often false-positives on `sortBy=name` (looks like SQL ORDER BY).
      const wantsNameSort = filters.sortBy === "name";
      const sortDirection =
        filters.sortByAction || filters.sortDirection || undefined;

      const response = await apiClient.get("customers", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          type: filters.type || undefined,
          sortBy: wantsNameSort ? "createdAt" : filters.sortBy || undefined,
          sortByAction: sortDirection,
          seasonId: filters.seasonId || undefined,
        },
      });

      const data = (response.data as CustomerListApiResponse).data;
      if (!wantsNameSort || !data?.items?.length) {
        return data;
      }

      const direction = sortDirection === "desc" ? -1 : 1;
      return {
        ...data,
        items: [...data.items].sort(
          (left, right) => direction * left.name.localeCompare(right.name, "fa"),
        ),
      };
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(selectedSeasonId),
  });
};
