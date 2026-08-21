import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const useDeleteRiceWarehouse = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (riceWarehouseId: string) =>
      apiClient.delete(`rice_warehouse/${riceWarehouseId}`),
    onSuccess: () => {
      toast.success(t("common:delete_success", { name: t("admin:rice_warehouse") }));
      queryClient.invalidateQueries({ queryKey: ["rice-warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["rice-warehouse-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      queryClient.invalidateQueries({ queryKey: ["customer-account"] });
    },
  });
};
