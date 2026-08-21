import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { PaddyWarehouseFormValues } from "../schemas/paddy-warehouse";

export const useCreatePaddyWarehouse = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: PaddyWarehouseFormValues) =>
      apiClient.post("/campany_owned_paddy", values),
    onSuccess: () => {
      toast.success(t("common:create_success", { name: t("admin:paddy_warehouse") }));
      queryClient.invalidateQueries({ queryKey: ["paddy-warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["entering-paddies"] });
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      queryClient.invalidateQueries({ queryKey: ["active-season"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-warehouse-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi-account"] });
      queryClient.invalidateQueries({ queryKey: ["cash"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customer-account"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
