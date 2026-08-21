import { apiClient } from "@/api/client";
import i18n from "@/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useDeleteCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`currencies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      toast.success(
        i18n.t("common:delete_success", {
          name: i18n.t("admin:currency"),
        }),
      );
    },
    onError: () => {
      toast.error(
        i18n.t("common:delete_error", {
          name: i18n.t("admin:currency"),
        }),
      );
    },
  });
};
