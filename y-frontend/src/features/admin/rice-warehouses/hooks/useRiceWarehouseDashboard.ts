import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import type { RiceDashboard } from "../schemas/rice-dashboard";

type RiceDashboardApiResponse = {
  statusCode: number;
  message: string;
  data: RiceDashboard;
};

export const useRiceWarehouseDashboard = () => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<RiceDashboard>({
    queryKey: ["rice-warehouse-dashboard", selectedSeasonId],
    queryFn: async () => {
      const response = await apiClient.get("rice_warehouse/dashboard");
      return (response.data as RiceDashboardApiResponse).data;
    },
    enabled: Boolean(selectedSeasonId),
  });
};
