import { apiClient } from "@/api/client";
import type { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ExpenseCategoryCreateFormValues } from "../schemas/expense-category";

export const useCreateExpenseCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: ExpenseCategoryCreateFormValues) =>
      apiClient.post("expense-categories", {
        code: values.code,
        ...(values.name?.trim() ? { name: values.name.trim() } : {}),
      }),
    onSuccess: () => {
      toast.success(
        t("common:create_success", { name: t("common:expense_category") }),
      );
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const raw = error.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join(" ") : raw;
      toast.error(
        message?.trim() ||
          t("common:create_error", { name: t("common:expense_category") }),
      );
    },
  });
};
