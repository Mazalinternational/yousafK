import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import type { PaddyProcessDashboard } from "../schemas/paddy-process-dashboard";

type PaddyProcessDashboardApiResponse = {
  statusCode: number;
  message: string;
  data: PaddyProcessDashboard;
};

export const usePaddyProcessDashboard = () => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<PaddyProcessDashboard>({
    queryKey: ["paddy-process-dashboard", selectedSeasonId],
    queryFn: async () => {
      const response = await apiClient.get("paddy_process/dashboard");
      return (response.data as PaddyProcessDashboardApiResponse).data;
    },
    enabled: Boolean(selectedSeasonId),
  });
};
