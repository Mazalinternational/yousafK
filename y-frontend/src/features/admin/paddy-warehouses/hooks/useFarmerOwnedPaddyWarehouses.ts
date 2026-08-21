import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PaddyWarehousesFilter } from "../types";
import type { FarmerOwnedPaddyWarehouse } from "../schemas/farmer-owned-paddy-warehouse";

type FarmerOwnedPaddyWarehouseListApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<FarmerOwnedPaddyWarehouse>;
};

export const useFarmerOwnedPaddyWarehouses = (
  filters: PaddyWarehousesFilter = {},
) => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<PaginatedResponse<FarmerOwnedPaddyWarehouse>>({
    queryKey: ["farmer-owned-paddy-warehouses", selectedSeasonId, filters],
    queryFn: async () => {
      const response = await apiClient.get("farmer_owned_paddy", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
          seasonId: filters.seasonId || undefined,
        },
      });

      return (response.data as FarmerOwnedPaddyWarehouseListApiResponse).data;
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(selectedSeasonId),
  });
};
