import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import type { JwaliAccount } from "../schemas/jwali";

type JwaliAccountApiResponse = {
  statusCode: number;
  message: string;
  data: JwaliAccount;
};

export const useJwaliAccount = (jwaliId?: string) => {
  return useQuery<JwaliAccount>({
    queryKey: ["jwali-account", jwaliId],
    enabled: Boolean(jwaliId),
    queryFn: async () => {
      const response = await apiClient.get(`/jwali/${jwaliId}/account`);
      return (response.data as JwaliAccountApiResponse).data;
    },
  });
};
