import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { EnteringPaddyFormValues } from "../schemas/entering-paddy";

export const useCreateEnteringPaddy = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: EnteringPaddyFormValues) =>
      apiClient.post("/entering_paddy", values),
    onSuccess: () => {
      toast.success(t("common:create_success", { name: t("admin:entering_paddy") }));
      queryClient.invalidateQueries({ queryKey: ["entering-paddies"] });
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      queryClient.invalidateQueries({ queryKey: ["active-season"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
