import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import type { RiceSaleFormValues } from "../schemas/rice-sale";
import { buildRiceSalePayload } from "../utils/buildRiceSalePayload";

const invalidateRiceSaleQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
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
};

export const useUpdateRiceSale = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: RiceSaleFormValues }) =>
      apiClient.patch(`rice_sales/${id}`, buildRiceSalePayload(values)),
    onSuccess: () => {
      toast.success(t("common:update_success", { name: t("admin:rice_sale") }));
      invalidateRiceSaleQueries(queryClient);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};

export const useDeleteRiceSale = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`rice_sales/${id}`),
    onSuccess: () => {
      toast.success(t("common:delete_success", { name: t("admin:rice_sale") }));
      invalidateRiceSaleQueries(queryClient);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
