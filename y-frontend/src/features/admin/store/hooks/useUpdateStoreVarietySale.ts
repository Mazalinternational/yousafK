import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import {
  buildStoreVarietySaleUpdatePayload,
  type StoreVarietySaleFormValues,
} from "../schemas/store-variety-sale";

const invalidateStoreVarietySaleQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  queryClient.invalidateQueries({ queryKey: ["stores"] });
  queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["sarafi"] });
  queryClient.invalidateQueries({ queryKey: ["sarafi-account"] });
  queryClient.invalidateQueries({ queryKey: ["customer-account"] });
  queryClient.invalidateQueries({ queryKey: ["customers"] });
  queryClient.invalidateQueries({ queryKey: ["cash-dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
};

export const useUpdateStoreVarietySale = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: StoreVarietySaleFormValues }) =>
      apiClient.patch(`stores/variety-sales/${id}`, buildStoreVarietySaleUpdatePayload(values)),
    onSuccess: () => {
      toast.success(t("common:store_variety_sale_update_success"));
      invalidateStoreVarietySaleQueries(queryClient);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};

export const useDeleteStoreVarietySale = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`stores/variety-sales/${id}`),
    onSuccess: () => {
      toast.success(t("common:store_variety_sale_delete_success"));
      invalidateStoreVarietySaleQueries(queryClient);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
