import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import type { ProcessRiceOptions } from "../schemas/process-rice";

type ProcessRiceOptionsApiResponse = {
  statusCode: number;
  message: string;
  data: ProcessRiceOptions;
};

export const useProcessRiceOptions = ({
  seasonId,
  excludeId,
}: {
  seasonId?: string | null;
  excludeId?: string;
}) => {
  return useQuery<ProcessRiceOptions>({
    queryKey: ["process-rice-options", seasonId, excludeId],
    queryFn: async () => {
      const response = await apiClient.get("process_rice/process-options", {
        params: { seasonId, excludeId },
      });
      return (response.data as ProcessRiceOptionsApiResponse).data;
    },
    enabled: Boolean(seasonId),
  });
};
