import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import type { PaddyDashboard } from "../schemas/paddy-dashboard";

type PaddyDashboardApiResponse = {
  statusCode: number;
  message: string;
  data: PaddyDashboard;
};

export const usePaddyWarehouseDashboard = () => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<PaddyDashboard>({
    queryKey: ["paddy-warehouse-dashboard", selectedSeasonId],
    queryFn: async () => {
      const response = await apiClient.get("campany_owned_paddy/dashboard");
      return (response.data as PaddyDashboardApiResponse).data;
    },
    enabled: Boolean(selectedSeasonId),
  });
};
