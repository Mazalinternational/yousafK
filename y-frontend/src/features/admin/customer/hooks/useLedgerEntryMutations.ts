import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type {
  BuyerPaymentFormValues,
  CompanyPaymentFormValues,
  FarmerRiceReturnFormValues,
} from "../schemas/customer";

type LedgerEntryUpdatePayload =
  | Partial<CompanyPaymentFormValues>
  | Partial<BuyerPaymentFormValues>
  | Partial<FarmerRiceReturnFormValues>
  | {
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
    }: {
      entryId: string;
      values: LedgerEntryUpdatePayload;
    }) =>
      apiClient.patch(`/customers/${customerId}/account/entries/${entryId}`, values),
    onSuccess: () => {
      toast.success(t("common:customer_ledger_entry_updated_success"));
      queryClient.invalidateQueries({ queryKey: ["customer-account", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["cash"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};

export const useDeleteLedgerEntry = (customerId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (entryId: string) =>
      apiClient.delete(`/customers/${customerId}/account/entries/${entryId}`),
    onSuccess: () => {
      toast.success(t("common:customer_ledger_entry_deleted_success"));
      queryClient.invalidateQueries({ queryKey: ["customer-account", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["cash"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
