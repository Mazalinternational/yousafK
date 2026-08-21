import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { StoreSaleFormValues } from "../schemas/store";

export const useSellStoreEntry = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: StoreSaleFormValues }) =>
      apiClient.post(`stores/${id}/sell`, values),
    onSuccess: () => {
      toast.success(t("common:store_sell_success"));
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["stores", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["stores", "variety-stock"] });
    },
    onError: () => {
      toast.error(t("common:store_sell_error"));
    },
  });
};
