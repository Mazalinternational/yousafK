import { apiClient } from "@/api/client";
import i18n from "@/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Expense, ExpenseFormValues } from "../schemas/expense";
import { sanitizeExpensePayload } from "../schemas/expense";

type ExpenseApiResponse = {
  statusCode: number;
  message: string;
  data: Expense;
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      const response = await apiClient.post("expenses", sanitizeExpensePayload(values));
      return (response.data as ExpenseApiResponse).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cash"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi-account"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer-account"] });
      toast.success(
        i18n.t("common:create_success", {
          name: i18n.t("admin:expenses"),
        }),
      );
    },
    onError: () => {
      toast.error(
        i18n.t("common:create_error", {
          name: i18n.t("admin:expenses"),
        }),
      );
    },
  });
};
