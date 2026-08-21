import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { RiceWarehousesFilter } from "../types";
import type { RiceWarehouse } from "../schemas/rice-warehouse";

type RiceWarehouseListApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<RiceWarehouse>;
};

export const useRiceWarehouses = (filters: RiceWarehousesFilter = {}) => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<PaginatedResponse<RiceWarehouse>>({
    queryKey: ["rice-warehouses", selectedSeasonId, filters],
    queryFn: async () => {
      const response = await apiClient.get("rice_warehouse", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
          seasonId: filters.seasonId || undefined,
        },
      });

      return (response.data as RiceWarehouseListApiResponse).data;
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(selectedSeasonId),
  });
};
