import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  buildStoreVarietySalePayload,
  type StoreVarietySaleFormValues,
} from "../schemas/store-variety-sale";

export const useCreateStoreVarietySale = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: StoreVarietySaleFormValues) =>
      apiClient.post("stores/variety-sales", buildStoreVarietySalePayload(values)),
    onSuccess: () => {
      toast.success(t("common:store_variety_sale_success"));
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi"] });
      queryClient.invalidateQueries({ queryKey: ["sarafi-account"] });
      queryClient.invalidateQueries({ queryKey: ["customer-account"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["cash-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
    },
    onError: (error) => {
      const data =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { data?: { message?: string | string[]; title?: string } } })
              .response?.data
          : undefined;
      const raw = data?.message ?? data?.title;
      const message = Array.isArray(raw)
        ? raw.join(", ")
        : typeof raw === "string"
          ? raw
          : t("common:store_variety_sale_error");
      toast.error(message);
    },
  });
};
