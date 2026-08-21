import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { SellerBalanceTransferFormValues } from "../schemas/customer";

export const useTransferSellerBalance = (customerId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: SellerBalanceTransferFormValues) =>
      apiClient.post(`/customers/${customerId}/account/seller-transfers`, {
        toCustomerId: values.toCustomerId,
        amount: values.amount,
        currencyId: values.currencyId,
        paymentDate: values.paymentDate,
        notes: values.notes,
      }),
    onSuccess: (_data, values) => {
      toast.success(t("common:seller_balance_transfer_success"));
      queryClient.invalidateQueries({ queryKey: ["customer-account", customerId] });
      if (values.toCustomerId?.trim()) {
        queryClient.invalidateQueries({
          queryKey: ["customer-account", values.toCustomerId.trim()],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["customer-account"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
