import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { RiceWarehouseFormValues } from "../schemas/rice-warehouse";

export const useCreateRiceWarehouse = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: RiceWarehouseFormValues) =>
      apiClient.post("/rice_warehouse", values),
    onSuccess: (_data, variables) => {
      toast.success(t("common:create_success", { name: t("admin:rice_warehouse") }));
      queryClient.invalidateQueries({ queryKey: ["rice-warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["rice-warehouse-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      queryClient.invalidateQueries({ queryKey: ["active-season"] });
      queryClient.invalidateQueries({ queryKey: ["cash-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["sarafs"] });
      queryClient.invalidateQueries({ queryKey: ["customer-account"] });
      if (variables.customerId) {
        queryClient.invalidateQueries({
          queryKey: ["customer-account", variables.customerId],
        });
      }
    },
  });
};
