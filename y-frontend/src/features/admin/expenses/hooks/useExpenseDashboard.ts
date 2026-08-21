import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import type { ExpenseDashboard } from "../schemas/expense-dashboard";

type ExpenseDashboardApiResponse = {
  statusCode: number;
  message: string;
  data: ExpenseDashboard;
};

export const useExpenseDashboard = () => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<ExpenseDashboard>({
    queryKey: ["expense-dashboard", selectedSeasonId],
    queryFn: async () => {
      const response = await apiClient.get("expenses/dashboard");
      return (response.data as ExpenseDashboardApiResponse).data;
    },
    enabled: Boolean(selectedSeasonId),
  });
};
