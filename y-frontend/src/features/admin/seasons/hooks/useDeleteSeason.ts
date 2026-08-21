import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";

export const useDeleteSeason = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (seasonId: string) => apiClient.delete(`seasons/${seasonId}`),
    onSuccess: () => {
      toast.success(t("common:delete_success", { name: t("admin:season") }));
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
