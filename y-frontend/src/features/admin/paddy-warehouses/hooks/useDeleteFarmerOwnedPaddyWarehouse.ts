import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";

export const useDeleteFarmerOwnedPaddyWarehouse = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/farmer_owned_paddy/${id}`),
    onSuccess: () => {
      toast.success(
        t("common:delete_success", {
          name: t("admin:farmer_owned_paddy_warehouse"),
        }),
      );
      queryClient.invalidateQueries({ queryKey: ["farmer-owned-paddy-warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["entering-paddies"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-warehouse-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["rice-availability"] });
      queryClient.invalidateQueries({ queryKey: ["active-season"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
