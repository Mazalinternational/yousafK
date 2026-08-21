import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { JwaliPaymentFormValues } from "../schemas/jwali";

export const useAddJwaliPayment = (jwaliId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: JwaliPaymentFormValues) => {
      const payload: Record<string, unknown> = {
        amount: values.amount,
        paymentDate: values.paymentDate,
        paymentChannel: values.paymentChannel,
        currencyId: values.currencyId?.trim(),
        notes: values.notes?.trim() || undefined,
      };

      if (values.paymentChannel === "saraf") {
        payload.sarafId = values.sarafId?.trim();
        payload.sarafLedgerCurrencyId = values.currencyId?.trim();
      }

      return apiClient.post(`/jwali/${jwaliId}/account/payments`, payload);
    },
    onSuccess: () => {
      toast.success(t("common:create_success", { name: t("common:jwali_payment") }));
      queryClient.invalidateQueries({ queryKey: ["jwali-account", jwaliId] });
      queryClient.invalidateQueries({ queryKey: ["jwali"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi-account"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cash", "dashboard"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
