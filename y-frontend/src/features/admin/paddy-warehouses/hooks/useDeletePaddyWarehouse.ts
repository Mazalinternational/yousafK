import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";

export const useDeletePaddyWarehouse = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (paddyWarehouseId: string) =>
      apiClient.delete(`campany_owned_paddy/${paddyWarehouseId}`),
    onSuccess: () => {
      toast.success(t("common:delete_success", { name: t("admin:paddy_warehouse") }));
      queryClient.invalidateQueries({ queryKey: ["paddy-warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["entering-paddies"] });
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      queryClient.invalidateQueries({ queryKey: ["cash"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
