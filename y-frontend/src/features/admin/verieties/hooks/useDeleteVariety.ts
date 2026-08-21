import { apiClient } from "@/api/client";
import i18n from "@/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiVarietyKind } from "../schemas/variety";

export const useDeleteVariety = (kind: ApiVarietyKind) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`varieties/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["varieties", kind] });
      toast.success(
        i18n.t("common:delete_success", {
          name: i18n.t("admin:veriety"),
        }),
      );
    },
    onError: () => {
      toast.error(
        i18n.t("common:delete_error", {
          name: i18n.t("admin:veriety"),
        }),
      );
    },
  });
};
