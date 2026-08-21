import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import type { RiceCharityFormValues } from "../schemas/rice-charity";
import { buildRiceCharityPayload } from "../utils/buildRiceCharityPayload";

export const useCreateRiceCharity = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: RiceCharityFormValues) =>
      apiClient.post("rice_charities", buildRiceCharityPayload(values)),
    onSuccess: () => {
      toast.success(t("common:create_success", { name: t("admin:rice_charity") }));
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
