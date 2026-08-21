import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ProcessRiceFormValues } from "../schemas/process-rice";

export const useUpdateProcessRice = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: ProcessRiceFormValues }) =>
      apiClient.patch(`process_rice/${id}`, {
        sourcePaddyProcessId: values.sourcePaddyProcessId,
        riceVariety: values.riceVariety,
        weight: values.weight,
      }),
    onSuccess: () => {
      toast.success(t("common:update_success", { name: t("admin:process_rice") }));
      queryClient.invalidateQueries({ queryKey: ["process-rice"] });
      queryClient.invalidateQueries({ queryKey: ["process-rice-options"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-processes"] });
      queryClient.invalidateQueries({ queryKey: ["paddy-process-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["rice-warehouse-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["rice-availability"] });
    },
  });
};
