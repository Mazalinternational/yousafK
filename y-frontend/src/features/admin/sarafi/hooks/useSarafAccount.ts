import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import type { SarafAccount } from "../schemas/sarafi";

type SarafAccountApiResponse = {
  statusCode: number;
  message: string;
  data: SarafAccount;
};

export const useSarafAccount = (sarafId?: string) => {
  return useQuery<SarafAccount>({
    queryKey: ["sarafi-account", sarafId],
    enabled: Boolean(sarafId),
    queryFn: async () => {
      const response = await apiClient.get(`/sarafi/${sarafId}/account`);
      return (response.data as SarafAccountApiResponse).data;
    },
  });
};
