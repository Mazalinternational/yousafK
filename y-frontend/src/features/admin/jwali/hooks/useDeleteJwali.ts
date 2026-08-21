import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";

export const useDeleteJwali = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/jwali/${id}`),
    onSuccess: () => {
      toast.success(t("common:delete_success", { name: t("admin:jwali:jwali") }));
      queryClient.invalidateQueries({ queryKey: ["jwali"] });
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      queryClient.invalidateQueries({ queryKey: ["active-season"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
