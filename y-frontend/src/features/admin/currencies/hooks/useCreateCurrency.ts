import { apiClient } from "@/api/client";
import type { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { CurrencyCreateFormValues } from "../schemas/currency";

export const useCreateCurrency = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: CurrencyCreateFormValues) =>
      apiClient.post("currencies", {
        code: values.code,
        ...(values.name?.trim() ? { name: values.name.trim() } : {}),
      }),
    onSuccess: () => {
      toast.success(t("common:create_success", { name: t("admin:currency") }));
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const raw = error.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join(" ") : raw;
      toast.error(
        message?.trim() ||
          t("common:create_error", {
            name: t("admin:currency"),
          }),
      );
    },
  });
};
