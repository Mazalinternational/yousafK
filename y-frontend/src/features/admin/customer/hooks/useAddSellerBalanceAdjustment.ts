import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { BuyerBalanceAdjustmentFormValues } from "../schemas/customer";

export const useAddSellerBalanceAdjustment = (customerId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: BuyerBalanceAdjustmentFormValues) =>
      apiClient.post(`/customers/${customerId}/account/seller-balance-adjustments`, {
        direction: values.direction,
        amount: values.amount,
        currencyId: values.currencyId,
        paymentDate: values.paymentDate,
        notes: values.notes,
      }),
    onSuccess: (_data, values) => {
      toast.success(
        values.direction === "debit"
          ? t("common:seller_debit_success")
          : t("common:seller_credit_success"),
      );
      queryClient.invalidateQueries({ queryKey: ["customer-account", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customer-account"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
