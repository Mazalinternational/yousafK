import { apiClient } from "@/api/client";
import type { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { CashTransactionFormValues } from "../schemas/cash";

export const useCreateCashTransaction = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: CashTransactionFormValues) =>
      apiClient.post("cash/transactions", {
        currencyId: values.currencyId,
        direction: values.direction,
        amount: values.amount,
        occurredAt: values.occurredAt,
        notes: values.notes?.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(t("common:cash_transaction_create_success"));
      queryClient.invalidateQueries({ queryKey: ["cash"] });
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const raw = error.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join(" ") : raw;
      toast.error(message?.trim() || t("common:cash_transaction_create_error"));
    },
  });
};
