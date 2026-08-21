import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { SalaryDeductionFormValues } from "../schemas/employee";

export const useAddSalaryDeduction = (employeeId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: SalaryDeductionFormValues) => {
      const payload = {
        amount: values.amount,
        paymentDate: values.paymentDate,
        salaryMonth: values.salaryMonth,
        notes: values.notes?.trim() || undefined,
      };

      return apiClient.post(`/employees/${employeeId}/account/salary-deductions`, payload);
    },
    onSuccess: () => {
      toast.success(t("common:create_success", { name: t("common:salary_deduction") }));
      queryClient.invalidateQueries({ queryKey: ["employee-account", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employee-salary-month-preview", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
