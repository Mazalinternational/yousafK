import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const useCompletePaddyProcess = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`paddy_process/${id}/complete`),
    onSuccess: () => {
      toast.success(t("common:update_success", { name: t("common:process_completed") }));
      queryClient.invalidateQueries({ queryKey: ["paddy-processes"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-process-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-process-stock"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-warehouse-dashboard"] });
    },
    onError: () => {
      toast.error(t("common:update_error", { name: t("common:process_completed") }));
    },
  });
};
