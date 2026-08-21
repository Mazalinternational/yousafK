import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { SeasonFormValues } from "../schemas/season";

export const useCreateSeason = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: SeasonFormValues) => apiClient.post("/seasons", values),
    onSuccess: () => {
      toast.success(t("common:create_success", { name: t("admin:season") }));
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
