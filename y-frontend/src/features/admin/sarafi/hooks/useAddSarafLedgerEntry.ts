import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { SarafLedgerEntryFormValues } from "../schemas/sarafi";

export const useAddSarafLedgerEntry = (sarafId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: SarafLedgerEntryFormValues) =>
      apiClient.post(`/sarafi/${sarafId}/account/entries`, {
        currencyId: values.currencyId,
        direction: values.direction,
        amount: values.amount,
        occurredAt: values.occurredAt,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      toast.success(t("common:create_success", { name: t("common:sarafi_cash_entry") }));
      queryClient.invalidateQueries({ queryKey: ["sarafi-account", sarafId] });
      queryClient.invalidateQueries({ queryKey: ["sarafi"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
