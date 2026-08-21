import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import type { PaddyProcessAvailability } from "../schemas/paddy-process";

type PaddyProcessAvailabilityApiResponse = {
  statusCode: number;
  message: string;
  data: PaddyProcessAvailability;
};

export const usePaddyProcessAvailability = ({
  seasonId,
  variety,
  excludeId,
}: {
  seasonId?: string;
  variety?: string;
  excludeId?: string;
}) => {
  return useQuery<PaddyProcessAvailability>({
    queryKey: ["paddy-process-stock", seasonId, variety, excludeId],
    enabled: Boolean(seasonId),
    queryFn: async () => {
      const response = await apiClient.get("paddy_process/stock", {
        params: {
          seasonId,
          variety: variety || undefined,
          excludeId: excludeId || undefined,
        },
      });

      return (response.data as PaddyProcessAvailabilityApiResponse).data;
    },
  });
};
