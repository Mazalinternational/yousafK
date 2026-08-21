import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import type { RiceSaleFormValues } from "../schemas/rice-sale";
import { buildRiceSalePayload } from "../utils/buildRiceSalePayload";

export const useCreateRiceSale = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: RiceSaleFormValues) =>
      apiClient.post("rice_sales", buildRiceSalePayload(values)),
    onSuccess: () => {
      toast.success(t("common:create_success", { name: t("admin:rice_sale") }));
      queryClient.invalidateQueries({ queryKey: ["rice-sales"] });
      queryClient.invalidateQueries({ queryKey: ["rice-warehouse-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer-account"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi-account"] });
      queryClient.invalidateQueries({ queryKey: ["rice-availability"] });
      queryClient.invalidateQueries({ queryKey: ["cash-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
