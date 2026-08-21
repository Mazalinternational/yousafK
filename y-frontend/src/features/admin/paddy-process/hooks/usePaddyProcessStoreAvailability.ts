import { apiClient } from "@/api/client";
import { useQueries } from "@tanstack/react-query";
import {
  PADDY_PROCESS_FROM_STORE_TYPES,
  type PaddyProcessFromStoreFormValues,
  type PaddyProcessStoreAvailability,
} from "../schemas/paddy-process";

type PaddyProcessStoreAvailabilityApiResponse = {
  statusCode: number;
  message: string;
  data: PaddyProcessStoreAvailability;
};

export const usePaddyProcessStoreAvailability = ({
  seasonId,
  storeType,
  excludeId,
}: {
  seasonId?: string;
  storeType?: PaddyProcessFromStoreFormValues["stockSourceType"];
  excludeId?: string;
}) => {
  const results = useQueries({
    queries: PADDY_PROCESS_FROM_STORE_TYPES.map((type) => ({
      queryKey: ["paddy-process-store-stock", seasonId, type, excludeId],
      enabled: Boolean(seasonId && storeType === type),
      queryFn: async () => {
        const response = await apiClient.get("paddy_process/store-stock", {
          params: {
            seasonId,
            storeType: type,
            excludeId: excludeId || undefined,
          },
        });

        return (response.data as PaddyProcessStoreAvailabilityApiResponse).data;
      },
    })),
  });

  const activeIndex = PADDY_PROCESS_FROM_STORE_TYPES.indexOf(storeType ?? "short_green");

  return {
    data: results[activeIndex]?.data,
    isLoading: results[activeIndex]?.isLoading ?? false,
  };
};

export const usePaddyProcessAllStoreAvailability = ({
  seasonId,
  excludeId,
}: {
  seasonId?: string;
  excludeId?: string;
}) => {
  const results = useQueries({
    queries: PADDY_PROCESS_FROM_STORE_TYPES.map((storeType) => ({
      queryKey: ["paddy-process-store-stock", seasonId, storeType, excludeId],
      enabled: Boolean(seasonId),
      queryFn: async () => {
        const response = await apiClient.get("paddy_process/store-stock", {
          params: {
            seasonId,
            storeType,
            excludeId: excludeId || undefined,
          },
        });

        return (response.data as PaddyProcessStoreAvailabilityApiResponse).data;
      },
    })),
  });

  const stockByType = Object.fromEntries(
    PADDY_PROCESS_FROM_STORE_TYPES.map((storeType, index) => [
      storeType,
      Number(results[index]?.data?.availableWeightKg ?? 0),
    ]),
  ) as Record<PaddyProcessFromStoreFormValues["stockSourceType"], number>;

  return {
    stockByType,
    isLoading: results.some((result) => result.isLoading),
  };
};
