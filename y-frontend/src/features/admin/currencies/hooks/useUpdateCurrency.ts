import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { CurrencyUpdateFormValues } from "../schemas/currency";

export const useUpdateCurrency = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: CurrencyUpdateFormValues }) =>
      apiClient.patch(`currencies/${id}`, values),
    onSuccess: () => {
      toast.success(t("common:update_success", { name: t("admin:currency") }));
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
    },
  });
};
