import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { BuyerPaymentFormValues } from "../schemas/customer";

export const useAddBuyerPayment = (customerId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: BuyerPaymentFormValues) =>
      apiClient.post(`/customers/${customerId}/account/buyer-payments`, {
        amount: values.amount?.trim() || undefined,
        paymentType: values.amount?.trim() ? "paid" : undefined,
        paymentChannel: values.paymentChannel,
        currencyId: values.currencyId?.trim() || undefined,
        sarafId:
          values.paymentChannel === "saraf" ? values.sarafId || undefined : undefined,
        paymentDate: values.paymentDate,
        notes: values.notes,
        payOnBehalf: values.payOnBehalf,
        onBehalfCustomerId: values.payOnBehalf
          ? values.onBehalfCustomerId
          : undefined,
        onBehalfAmount: values.payOnBehalf ? values.onBehalfAmount : undefined,
        onBehalfCurrencyId: values.payOnBehalf
          ? values.onBehalfCurrencyId?.trim() || undefined
          : undefined,
        onBehalfPaymentType:
          values.payOnBehalf && values.onBehalfAmount?.trim() ? "paid" : undefined,
      }),
    onSuccess: (_data, values) => {
      toast.success(t("common:customer_payment_added_success"));
      queryClient.invalidateQueries({ queryKey: ["customer-account", customerId] });
      if (values.payOnBehalf && values.onBehalfCustomerId?.trim()) {
        queryClient.invalidateQueries({
          queryKey: ["customer-account", values.onBehalfCustomerId.trim()],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["customer-account"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["cash"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
