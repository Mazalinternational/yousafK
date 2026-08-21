import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";

export const useDeleteSalaryLedgerEntry = (employeeId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (entryId: string) =>
      apiClient.delete(`/employees/${employeeId}/account/entries/${entryId}`),
    onSuccess: () => {
      toast.success(t("common:employee_ledger_entry_deleted_success"));
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
