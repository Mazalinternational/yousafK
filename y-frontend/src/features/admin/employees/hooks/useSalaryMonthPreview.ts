import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import type { SalaryMonthPreview } from "../schemas/employee";

type SalaryMonthPreviewApiResponse = {
  statusCode: number;
  message: string;
  data: SalaryMonthPreview;
};

export const useSalaryMonthPreview = (
  employeeId?: string,
  salaryMonth?: string,
) => {
  return useQuery<SalaryMonthPreview>({
    queryKey: ["employee-salary-month-preview", employeeId, salaryMonth],
    enabled: Boolean(employeeId && salaryMonth),
    queryFn: async () => {
      const response = await apiClient.get(
        `/employees/${employeeId}/account/salary-month-preview`,
        { params: { salaryMonth } },
      );
      return (response.data as SalaryMonthPreviewApiResponse).data;
    },
  });
};
