import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { StoreStockFormValues } from "../schemas/store";

export const useCreateStoreEntry = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: StoreStockFormValues) =>
      apiClient.post("stores", {
        storeType: values.storeType,
        sourcePaddyProcessId: values.sourcePaddyProcessId,
        weight: values.weight,
      }),
    onSuccess: (_, values) => {
      toast.success(t("common:create_success", { name: t(`common:${values.storeType}`) }));
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["stores", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["stores", "variety-stock"] });
      queryClient.invalidateQueries({ queryKey: ["store-process-options"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-processes"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-process-dashboard"] });
    },
    onError: (error) => {
      const raw = isAxiosError(error) ? error.response?.data?.message : undefined;
      const message = Array.isArray(raw) ? raw.join(", ") : raw;
      toast.error(message || t("common:create_error", { name: t("admin:store") }));
    },
  });
};
