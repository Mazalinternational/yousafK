import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import type { EnteringPaddyDashboard } from "../schemas/entering-paddy-dashboard";

type EnteringPaddyDashboardApiResponse = {
  statusCode: number;
  message: string;
  data: EnteringPaddyDashboard;
};

export const useEnteringPaddyDashboard = () => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<EnteringPaddyDashboard>({
    queryKey: ["entering-paddy-dashboard", selectedSeasonId],
    queryFn: async () => {
      const response = await apiClient.get("entering_paddy/dashboard");
      return (response.data as EnteringPaddyDashboardApiResponse).data;
    },
    enabled: Boolean(selectedSeasonId),
  });
};
