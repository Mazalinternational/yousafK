import { apiClient } from "@/api/client";
import type { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const useDeleteExpenseCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`expense-categories/${id}`),
    onSuccess: () => {
      toast.success(
        t("common:delete_success", { name: t("common:expense_category") }),
      );
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const raw = error.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join(" ") : raw;
      toast.error(
        message?.trim() ||
          t("common:delete_error", { name: t("common:expense_category") }),
      );
    },
  });
};
