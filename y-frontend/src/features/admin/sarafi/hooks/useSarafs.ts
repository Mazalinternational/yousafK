import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Saraf } from "../schemas/sarafi";

type SarafsListApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<Saraf>;
};

export const useSarafs = (filters: {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  sortByAction?: "asc" | "desc";
  seasonId?: string;
} = {}) => {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<PaginatedResponse<Saraf>>({
    queryKey: ["sarafi", selectedSeasonId, filters],
    queryFn: async () => {
      // Host WAF (ModSecurity) often false-positives on sortBy / sortByAction.
      // Omit sort params and sort by name in the browser when requested.
      const wantsNameSort = !filters.sortBy || filters.sortBy === "name";
      const sortDirection =
        filters.sortByAction || filters.sortDirection || "asc";

      const response = await apiClient.get("sarafi", {
        params: {
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          seasonId: filters.seasonId || undefined,
        },
      });

      const data = (response.data as SarafsListApiResponse).data;
      if (!wantsNameSort || !data?.items?.length) {
        return data;
      }

      const direction = sortDirection === "desc" ? -1 : 1;
      return {
        ...data,
        items: [...data.items].sort(
          (left, right) => direction * left.name.localeCompare(right.name, "fa"),
        ),
      };
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(selectedSeasonId),
  });
};
