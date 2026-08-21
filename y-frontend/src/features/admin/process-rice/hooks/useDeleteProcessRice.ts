import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const useDeleteProcessRice = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`process_rice/${id}`),
    onSuccess: () => {
      toast.success(t("common:delete_success", { name: t("admin:process_rice") }));
      queryClient.invalidateQueries({ queryKey: ["process-rice"] });
      queryClient.invalidateQueries({ queryKey: ["process-rice-options"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-processes"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-process-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["rice-warehouse-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["rice-availability"] });
    },
  });
};
