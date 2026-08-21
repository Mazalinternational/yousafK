import { apiClient } from "@/api/client";
import type { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ExpenseCategoryUpdateFormValues } from "../schemas/expense-category";

export const useUpdateExpenseCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: ExpenseCategoryUpdateFormValues;
    }) => apiClient.patch(`expense-categories/${id}`, values),
    onSuccess: () => {
      toast.success(
        t("common:update_success", { name: t("common:expense_category") }),
      );
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const raw = error.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join(" ") : raw;
      toast.error(
        message?.trim() ||
          t("common:update_error", { name: t("common:expense_category") }),
      );
    },
  });
};
