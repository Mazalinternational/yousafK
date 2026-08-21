import { apiClient } from "@/api/client";
import type { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ApiVarietyKind } from "../schemas/variety";
import type { VarietyUpdateFormValues } from "../schemas/variety";

export const useUpdateVariety = (kind: ApiVarietyKind) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: VarietyUpdateFormValues }) =>
      apiClient.patch(`varieties/${id}`, values),
    onSuccess: () => {
      toast.success(t("common:update_success", { name: t("admin:veriety") }));
      void queryClient.invalidateQueries({ queryKey: ["varieties", kind] });
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const raw = error.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join(" ") : raw;
      toast.error(
        message?.trim() ||
          t("common:update_error", {
            name: t("admin:veriety"),
          }),
      );
    },
  });
};
