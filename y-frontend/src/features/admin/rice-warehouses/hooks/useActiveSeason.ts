import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import type { Season } from "../../seasons/schemas/season";

type ActiveSeasonApiResponse = {
  statusCode: number;
  message: string;
  data: Season;
};

export const useActiveSeason = () => {
  return useQuery<Season | null>({
    queryKey: ["active-season"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("seasons/active");
        return (response.data as ActiveSeasonApiResponse).data;
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 404) {
          return null;
        }

        throw error;
      }
    },
    retry: false,
  });
};
