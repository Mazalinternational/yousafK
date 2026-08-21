import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useTranslation } from "react-i18next";
import type { InvestorFormValues } from "../schemas/investor";

export const useCreateInvestor = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: InvestorFormValues) => apiClient.post("/investors", values),
    onSuccess: () => {
      toast.success(t("common:create_success", { name: t("admin:investor:investor") }));
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["investors-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["general-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      queryClient.invalidateQueries({ queryKey: ["active-season"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
    },
  });
};
