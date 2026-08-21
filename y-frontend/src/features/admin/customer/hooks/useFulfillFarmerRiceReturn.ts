import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";

export const useFulfillFarmerRiceReturn = (customerId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (entryId: string) =>
      apiClient.post(
        `/customers/${customerId}/account/farmer-returns/${entryId}/fulfill`,
      ),
    onSuccess: () => {
      toast.success(t("common:farmer_rice_return_fulfilled_success"));
      queryClient.invalidateQueries({ queryKey: ["customer-account", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["rice-warehouse-dashboard"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
