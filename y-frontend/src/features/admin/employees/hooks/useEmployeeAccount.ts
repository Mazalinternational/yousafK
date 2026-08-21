import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import type { EmployeeAccount } from "../schemas/employee";

type EmployeeAccountApiResponse = {
  statusCode: number;
  message: string;
  data: EmployeeAccount;
};

export const useEmployeeAccount = (employeeId?: string) => {
  return useQuery<EmployeeAccount>({
    queryKey: ["employee-account", employeeId],
    enabled: Boolean(employeeId),
    queryFn: async () => {
      const response = await apiClient.get(`/employees/${employeeId}/account`);
      return (response.data as EmployeeAccountApiResponse).data;
    },
  });
};
