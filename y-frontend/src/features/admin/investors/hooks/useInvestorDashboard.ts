import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import type { InvestorDashboard } from "../schemas/investor-dashboard";

type InvestorDashboardApiResponse = {
  statusCode: number;
  message: string;
  data: InvestorDashboard;
};

export const useInvestorDashboard = () => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<InvestorDashboard>({
    queryKey: ["investors-dashboard", selectedSeasonId],
    queryFn: async () => {
      const response = await apiClient.get("investors/dashboard");
      return (response.data as InvestorDashboardApiResponse).data;
    },
    enabled: Boolean(selectedSeasonId),
  });
};
