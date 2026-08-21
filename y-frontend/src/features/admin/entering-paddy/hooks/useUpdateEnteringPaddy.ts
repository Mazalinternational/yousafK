import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { EnteringPaddyFormValues } from "../schemas/entering-paddy";

export const useUpdateEnteringPaddy = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: EnteringPaddyFormValues }) =>
      apiClient.patch(`/entering_paddy/${id}`, values),
    onSuccess: () => {
      toast.success(t("common:update_success", { name: t("admin:entering_paddy") }));
      queryClient.invalidateQueries({ queryKey: ["entering-paddies"] });
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      queryClient.invalidateQueries({ queryKey: ["active-season"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
