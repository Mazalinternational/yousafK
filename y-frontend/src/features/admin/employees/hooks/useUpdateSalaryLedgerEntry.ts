import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type {
  CreditRepaymentFormValues,
  SalaryDeductionFormValues,
  SalaryPaymentFormValues,
} from "../schemas/employee";

export type UpdateSalaryLedgerEntryPayload =
  | SalaryPaymentFormValues
  | SalaryDeductionFormValues
  | CreditRepaymentFormValues;

const buildUpdatePayload = (values: UpdateSalaryLedgerEntryPayload) => {
  const payload: Record<string, unknown> = {
    amount: values.amount,
    paymentDate: values.paymentDate,
    notes: values.notes?.trim() || undefined,
  };

  if ("salaryMonth" in values && values.salaryMonth) {
    payload.salaryMonth = values.salaryMonth;
  }

  if ("paymentChannel" in values) {
    payload.paymentChannel = values.paymentChannel;
    payload.sarafLedgerCurrencyId = values.sarafLedgerCurrencyId?.trim();
    if (values.paymentChannel === "saraf") {
      payload.sarafId = values.sarafId?.trim();
    }
  }

  return payload;
};

export const useUpdateSalaryLedgerEntry = (employeeId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      entryId,
      values,
    }: {
      entryId: string;
      values: UpdateSalaryLedgerEntryPayload;
    }) =>
      apiClient.patch(
        `/employees/${employeeId}/account/entries/${entryId}`,
        buildUpdatePayload(values),
      ),
    onSuccess: () => {
      toast.success(t("common:employee_ledger_entry_updated_success"));
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
