import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";

export const useDeleteJwaliPayment = (jwaliId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (paymentId: string) =>
      apiClient.delete(`/jwali/${jwaliId}/account/payments/${paymentId}`),
    onSuccess: () => {
      toast.success(t("common:delete_success", { name: t("common:jwali_payment") }));
      queryClient.invalidateQueries({ queryKey: ["jwali-account", jwaliId] });
      queryClient.invalidateQueries({ queryKey: ["jwali"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi-account"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cash", "dashboard"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};

