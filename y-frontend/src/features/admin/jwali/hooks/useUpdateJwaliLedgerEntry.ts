import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { JwaliLedgerEntryFormValues } from "../schemas/jwali";

export const useUpdateJwaliLedgerEntry = (jwaliId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (params: { entryId: string; values: JwaliLedgerEntryFormValues }) =>
      apiClient.patch(`/jwali/${jwaliId}/account/entries/${params.entryId}`, params.values),
    onSuccess: () => {
      toast.success(t("common:update_success", { name: t("common:jwali_entry") }));
      queryClient.invalidateQueries({ queryKey: ["jwali-account", jwaliId] });
      queryClient.invalidateQueries({ queryKey: ["jwali"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};

