import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import type { StoreType } from "../schemas/store";
import type { StoreVarietyStockResponse } from "../schemas/store-dashboard";

type StoreVarietyStockApiResponse = {
  statusCode: number;
  message: string;
  data: StoreVarietyStockResponse;
};

export const useStoreVarietyStock = ({
  storeType,
  seasonId,
}: {
  storeType: StoreType;
  seasonId?: string | null;
}) => {
  return useQuery<StoreVarietyStockResponse>({
    queryKey: ["stores", "variety-stock", storeType, seasonId],
    queryFn: async () => {
      const response = await apiClient.get("stores/variety-stock", {
        params: { storeType, seasonId },
      });
      return (response.data as StoreVarietyStockApiResponse).data;
    },
    enabled: Boolean(seasonId),
  });
};
