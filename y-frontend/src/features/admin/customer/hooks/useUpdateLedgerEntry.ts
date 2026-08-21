import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";

export type UpdateLedgerEntryPayload = {
  amount?: string;
  paymentType?: string;
  paidAmount?: string;
  paymentChannel?: string;
  currencyId?: string;
  sarafId?: string;
  paymentDate?: string;
  notes?: string;
  riceQuantity?: string;
  riceVariety?: string;
  unit?: string;
  returnDate?: string;
  scheduledFor?: string | null;
};

export const useUpdateLedgerEntry = (customerId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      entryId,
      values,
      counterpartyCustomerId,
    }: {
      entryId: string;
      values: UpdateLedgerEntryPayload;
      counterpartyCustomerId?: string | null;
    }) =>
      apiClient.patch(`/customers/${customerId}/account/entries/${entryId}`, values),
    onSuccess: (_data, variables) => {
      toast.success(t("common:customer_ledger_entry_updated_success"));
      queryClient.invalidateQueries({ queryKey: ["customer-account", customerId] });
      if (variables.counterpartyCustomerId?.trim()) {
        queryClient.invalidateQueries({
          queryKey: ["customer-account", variables.counterpartyCustomerId.trim()],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["customer-account"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["cash"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi"] });
      queryClient.invalidateQueries({ queryKey: ["rice-warehouse-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
