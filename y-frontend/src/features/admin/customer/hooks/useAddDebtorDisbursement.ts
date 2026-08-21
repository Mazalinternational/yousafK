import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { CompanyPaymentFormValues } from "../schemas/customer";

export const useAddDebtorDisbursement = (customerId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: CompanyPaymentFormValues) =>
      apiClient.post(`/customers/${customerId}/account/debtor-disbursements`, {
        amount: values.amount,
        paymentType: values.paymentType,
        paidAmount:
          values.paymentType === "partial_paid" ? values.paidAmount : undefined,
        paymentChannel: values.paymentChannel,
        currencyId:
          values.paymentType === "remaining" ? undefined : values.currencyId,
        sarafId:
          values.paymentChannel === "saraf" && values.paymentType !== "remaining"
            ? values.sarafId
            : undefined,
        paymentDate: values.paymentDate,
        notes: values.notes,
      }),
    onSuccess: () => {
      toast.success(t("common:customer_debtor_disbursement_added_success"));
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
