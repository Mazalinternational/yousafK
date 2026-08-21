import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PaddyWarehousesFilter } from "../types";
import type { PaddyWarehouse } from "../schemas/paddy-warehouse";

type PaddyWarehouseListApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<PaddyWarehouse>;
};

export const usePaddyWarehouses = (filters: PaddyWarehousesFilter = {}) => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<PaginatedResponse<PaddyWarehouse>>({
    queryKey: ["paddy-warehouses", selectedSeasonId, filters],
    queryFn: async () => {
      const response = await apiClient.get("campany_owned_paddy", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
          seasonId: filters.seasonId || undefined,
        },
      });

      return (response.data as PaddyWarehouseListApiResponse).data;
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(selectedSeasonId),
  });
};
