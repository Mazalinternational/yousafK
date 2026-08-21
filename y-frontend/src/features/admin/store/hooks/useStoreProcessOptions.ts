import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import type { StoreProcessOptions, StoreType } from "../schemas/store";

type StoreProcessOptionsApiResponse = {
  statusCode: number;
  message: string;
  data: StoreProcessOptions;
};

export const useStoreProcessOptions = ({
  seasonId,
  storeType,
}: {
  seasonId?: string | null;
  storeType: StoreType;
}) => {
  return useQuery<StoreProcessOptions>({
    queryKey: ["store-process-options", seasonId, storeType],
    queryFn: async () => {
      const response = await apiClient.get("stores/process-options", {
        params: {
          seasonId,
          storeType,
        },
      });

      return (response.data as StoreProcessOptionsApiResponse).data;
    },
    enabled: Boolean(seasonId),
  });
};
