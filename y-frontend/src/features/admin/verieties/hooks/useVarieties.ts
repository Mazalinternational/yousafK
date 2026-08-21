import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ApiVarietyKind, Variety } from "../schemas/variety";

type VarietiesListApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<Variety>;
};

export const useVarieties = (
  kind: ApiVarietyKind,
  filters: {
    pageNumber?: number;
    pageSize?: number;
    query?: string;
    isActive?: string;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    sortByAction?: "asc" | "desc";
  } = {},
) => {
  return useQuery<PaginatedResponse<Variety>>({
    queryKey: ["varieties", kind, filters],
    queryFn: async () => {
      const response = await apiClient.get("varieties", {
        params: {
          kind,
          pageNumber: filters.pageNumber || 1,
          pageSize: filters.pageSize || 10,
          query: filters.query || undefined,
          isActive: filters.isActive || undefined,
          sortBy: filters.sortBy || undefined,
          sortByAction: filters.sortByAction || filters.sortDirection || undefined,
        },
      });

      return (response.data as VarietiesListApiResponse).data;
    },
    enabled: Boolean(kind),
    placeholderData: keepPreviousData,
  });
};
