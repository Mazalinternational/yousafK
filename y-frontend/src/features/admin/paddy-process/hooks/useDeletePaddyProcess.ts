import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const useDeletePaddyProcess = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`paddy_process/${id}`),
    onSuccess: () => {
      toast.success(t("common:delete_success", { name: t("admin:paddy_process") }));
      queryClient.invalidateQueries({ queryKey: ["paddy-processes"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-process-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-process-stock"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-process-store-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-warehouse-dashboard"] });
    },
    onError: () => {
      toast.error(t("common:delete_error", { name: t("admin:paddy_process") }));
    },
  });
};
