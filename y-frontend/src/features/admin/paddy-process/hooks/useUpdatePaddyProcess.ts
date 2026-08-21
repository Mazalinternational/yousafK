import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type {
  PaddyProcessFormValues,
  PaddyProcessFromStoreFormValues,
} from "../schemas/paddy-process";

export const useUpdatePaddyProcess = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: PaddyProcessFormValues | PaddyProcessFromStoreFormValues;
    }) => apiClient.patch(`paddy_process/${id}`, { weight: values.weight }),
    onSuccess: () => {
      toast.success(t("common:update_success", { name: t("admin:paddy_process") }));
      queryClient.invalidateQueries({ queryKey: ["paddy-processes"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-process-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-process-stock"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-process-store-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-warehouse-dashboard"] });
    },
    onError: () => {
      toast.error(t("common:update_error", { name: t("admin:paddy_process") }));
    },
  });
};
