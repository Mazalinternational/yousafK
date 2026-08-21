import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { SeasonFormValues } from "../schemas/season";

export const useUpdateSeason = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: SeasonFormValues }) =>
      apiClient.patch(`seasons/${id}`, values),
    onSuccess: () => {
      toast.success(t("common:update_success", { name: t("admin:season") }));
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
