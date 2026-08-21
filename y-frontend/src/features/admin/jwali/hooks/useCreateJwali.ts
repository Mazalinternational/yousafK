import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { JwaliFormValues } from "../schemas/jwali";

export const useCreateJwali = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: JwaliFormValues) => apiClient.post("/jwali", values),
    onSuccess: () => {
      toast.success(t("common:create_success", { name: t("admin:jwali:jwali") }));
      queryClient.invalidateQueries({ queryKey: ["jwali"] });
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      queryClient.invalidateQueries({ queryKey: ["active-season"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
