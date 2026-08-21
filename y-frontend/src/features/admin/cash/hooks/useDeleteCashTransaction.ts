import { apiClient } from "@/api/client";
import type { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const useDeleteCashTransaction = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`cash/transactions/${id}`),
    onSuccess: () => {
      toast.success(t("common:cash_transaction_delete_success"));
      queryClient.invalidateQueries({ queryKey: ["cash"] });
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const raw = error.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join(" ") : raw;
      toast.error(message?.trim() || t("common:cash_transaction_delete_error"));
    },
  });
};
