import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { SalaryPaymentFormValues } from "../schemas/employee";

export const useAddSalaryPayment = (employeeId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: SalaryPaymentFormValues) => {
      const payload: Record<string, unknown> = {
        amount: values.amount,
        paymentDate: values.paymentDate,
        salaryMonth: values.salaryMonth,
        paymentChannel: values.paymentChannel,
        notes: values.notes?.trim() || undefined,
      };

      payload.sarafLedgerCurrencyId = values.sarafLedgerCurrencyId?.trim();
      if (values.paymentChannel === "saraf") {
        payload.sarafId = values.sarafId?.trim();
      }

      return apiClient.post(`/employees/${employeeId}/account/salary-payments`, payload);
    },
    onSuccess: () => {
      toast.success(t("common:create_success", { name: t("common:salary_payment") }));
      queryClient.invalidateQueries({ queryKey: ["employee-account", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employee-salary-month-preview", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi-account"] });
      queryClient.invalidateQueries({ queryKey: ["cash"] });
      queryClient.invalidateQueries({ queryKey: ["cash-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
