import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import type { CashDashboard } from "../schemas/cash";

type CashDashboardApiResponse = {
  statusCode: number;
  message: string;
  data: CashDashboard;
};

export const useCashDashboard = () => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<CashDashboard>({
    queryKey: ["cash", "dashboard", selectedSeasonId],
    queryFn: async () => {
      const response = await apiClient.get("cash/dashboard");
      return (response.data as CashDashboardApiResponse).data;
    },
    enabled: Boolean(selectedSeasonId),
  });
};
