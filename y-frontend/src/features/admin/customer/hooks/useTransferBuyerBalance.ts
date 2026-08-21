import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { BuyerBalanceTransferFormValues } from "../schemas/customer";

export const useTransferBuyerBalance = (customerId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: BuyerBalanceTransferFormValues) =>
      apiClient.post(`/customers/${customerId}/account/buyer-payments`, {
        paymentDate: values.paymentDate,
        notes: values.notes,
        payOnBehalf: true,
        onBehalfCustomerId: values.toCustomerId,
        onBehalfAmount: values.amount,
        onBehalfCurrencyId: values.currencyId,
        onBehalfPaymentType: "paid",
      }),
    onSuccess: (_data, values) => {
      toast.success(t("common:buyer_balance_transfer_success"));
      queryClient.invalidateQueries({ queryKey: ["customer-account", customerId] });
      if (values.toCustomerId?.trim()) {
        queryClient.invalidateQueries({
          queryKey: ["customer-account", values.toCustomerId.trim()],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["customer-account"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
