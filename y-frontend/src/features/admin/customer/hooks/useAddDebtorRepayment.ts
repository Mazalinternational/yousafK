import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { BuyerPaymentFormValues } from "../schemas/customer";

export const useAddDebtorRepayment = (customerId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: BuyerPaymentFormValues) =>
      apiClient.post(`/customers/${customerId}/account/debtor-repayments`, {
        amount: values.amount,
        paymentChannel: values.paymentChannel,
        currencyId: values.currencyId,
        sarafId:
          values.paymentChannel === "saraf" ? values.sarafId : undefined,
        paymentDate: values.paymentDate,
        notes: values.notes,
      }),
    onSuccess: () => {
      toast.success(t("common:customer_debtor_repayment_added_success"));
      queryClient.invalidateQueries({ queryKey: ["customer-account", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["cash"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
