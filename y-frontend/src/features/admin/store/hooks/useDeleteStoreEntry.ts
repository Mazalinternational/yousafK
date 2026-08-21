import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getErrorMessage } from "@/utils/getErrorMessage";

export const useDeleteStoreEntry = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`stores/${id}`),
    onSuccess: () => {
      toast.success(t("common:delete_success", { name: t("admin:store") }));
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["store-process-options"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
