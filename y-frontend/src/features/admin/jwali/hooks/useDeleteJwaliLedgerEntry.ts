import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";

export const useDeleteJwaliLedgerEntry = (jwaliId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (entryId: string) => apiClient.delete(`/jwali/${jwaliId}/account/entries/${entryId}`),
    onSuccess: () => {
      toast.success(t("common:delete_success", { name: t("common:jwali_entry") }));
      queryClient.invalidateQueries({ queryKey: ["jwali-account", jwaliId] });
      queryClient.invalidateQueries({ queryKey: ["jwali"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};

