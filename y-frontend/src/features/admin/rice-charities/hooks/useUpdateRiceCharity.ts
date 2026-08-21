import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import type { RiceCharityFormValues } from "../schemas/rice-charity";
import { buildRiceCharityPayload } from "../utils/buildRiceCharityPayload";

export const useUpdateRiceCharity = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: RiceCharityFormValues }) =>
      apiClient.patch(`rice_charities/${id}`, buildRiceCharityPayload(values)),
    onSuccess: () => {
      toast.success(t("common:update_success", { name: t("admin:rice_charity") }));
      queryClient.invalidateQueries({ queryKey: ["rice-charities"] });
      queryClient.invalidateQueries({ queryKey: ["rice-warehouse-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["rice-availability"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};

export const useDeleteRiceCharity = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`rice_charities/${id}`),
    onSuccess: () => {
      toast.success(t("common:delete_success", { name: t("admin:rice_charity") }));
      queryClient.invalidateQueries({ queryKey: ["rice-charities"] });
      queryClient.invalidateQueries({ queryKey: ["rice-warehouse-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["rice-availability"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
