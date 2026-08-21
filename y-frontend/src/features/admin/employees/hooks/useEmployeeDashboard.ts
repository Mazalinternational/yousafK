import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import type { EmployeeDashboard } from "../schemas/employee-dashboard";

type EmployeeDashboardApiResponse = {
  statusCode: number;
  message: string;
  data: EmployeeDashboard;
};

export const useEmployeeDashboard = () => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<EmployeeDashboard>({
    queryKey: ["employee-dashboard", selectedSeasonId],
    queryFn: async () => {
      const response = await apiClient.get("employees/dashboard");
      return (response.data as EmployeeDashboardApiResponse).data;
    },
    enabled: Boolean(selectedSeasonId),
  });
};
