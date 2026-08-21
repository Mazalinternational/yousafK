import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type {
  PaddyProcessFormValues,
  PaddyProcessFromStoreFormValues,
} from "../schemas/paddy-process";
import { toPaddyProcessCreatePayload } from "../utils/paddy-process-api";

export const useCreatePaddyProcess = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: PaddyProcessFormValues | PaddyProcessFromStoreFormValues) =>
      apiClient.post("paddy_process", toPaddyProcessCreatePayload(values)),
    onSuccess: () => {
      toast.success(t("common:create_success", { name: t("admin:paddy_process") }));
      queryClient.invalidateQueries({ queryKey: ["paddy-processes"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-process-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-process-stock"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-process-store-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-warehouse-dashboard"] });
    },
    onError: () => {
      toast.error(t("common:create_error", { name: t("admin:paddy_process") }));
    },
  });
};
