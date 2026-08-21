import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import type { StoreDashboard } from "../schemas/store-dashboard";

type StoreDashboardApiResponse = {
  statusCode: number;
  message: string;
  data: StoreDashboard;
};

export const useStoreDashboard = () => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<StoreDashboard>({
    queryKey: ["stores", "dashboard", selectedSeasonId],
    queryFn: async () => {
      const response = await apiClient.get("stores/dashboard");
      return (response.data as StoreDashboardApiResponse).data;
    },
    enabled: Boolean(selectedSeasonId),
  });
};
