import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { PaddyWarehouseFormValues } from "../schemas/paddy-warehouse";
import { buildCompanyPaddyWarehousePayload } from "../utils/buildCompanyPaddyWarehousePayload";

export const useUpdatePaddyWarehouse = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: PaddyWarehouseFormValues }) =>
      apiClient.patch(
        `campany_owned_paddy/${id}`,
        buildCompanyPaddyWarehousePayload(values),
      ),
    onSuccess: () => {
      toast.success(t("common:update_success", { name: t("admin:paddy_warehouse") }));
      queryClient.invalidateQueries({ queryKey: ["paddy-warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["entering-paddies"] });
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
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
