import { apiClient } from "@/api/client";
import type { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { CashTransactionFormValues } from "../schemas/cash";

export const useUpdateCashTransaction = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: CashTransactionFormValues }) =>
      apiClient.patch(`cash/transactions/${id}`, {
        currencyId: values.currencyId,
        direction: values.direction,
        amount: values.amount,
        occurredAt: values.occurredAt,
        notes: values.notes?.trim() || null,
      }),
    onSuccess: () => {
      toast.success(t("common:cash_transaction_update_success"));
      queryClient.invalidateQueries({ queryKey: ["cash"] });
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const raw = error.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join(" ") : raw;
      toast.error(message?.trim() || t("common:cash_transaction_update_error"));
    },
  });
};
