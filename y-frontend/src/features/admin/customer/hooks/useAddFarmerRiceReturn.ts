import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { FarmerRiceReturnFormValues } from "../schemas/customer";

export const useAddFarmerRiceReturn = (customerId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: FarmerRiceReturnFormValues) =>
      apiClient.post(`/customers/${customerId}/account/farmer-returns`, {
        ...values,
        scheduledFor: values.scheduledFor || null,
      }),
    onSuccess: () => {
      toast.success(t("common:farmer_rice_return_added_success"));
      queryClient.invalidateQueries({ queryKey: ["customer-account", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
