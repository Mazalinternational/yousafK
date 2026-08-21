import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import type { PaginatedResponse } from "@/types";
import type { StoreType } from "../schemas/store";
import type { StoreVarietySale } from "../schemas/store-variety-sale";

type ApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<StoreVarietySale>;
};

export const useStoreVarietySales = ({
  storeType,
  seasonId,
  pageNumber = 1,
  pageSize = 10,
  query,
  sortBy = "createdAt",
  sortByAction = "desc",
}: {
  storeType: StoreType;
  seasonId?: string | null;
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  sortBy?: string;
  sortByAction?: "asc" | "desc";
}) => {
  return useQuery<PaginatedResponse<StoreVarietySale>>({
    queryKey: [
      "stores",
      "variety-sales",
      storeType,
      seasonId,
      pageNumber,
      pageSize,
      query,
      sortBy,
      sortByAction,
    ],
    queryFn: async () => {
      const response = await apiClient.get("stores/variety-sales", {
        params: {
          storeType,
          seasonId,
          pageNumber,
          pageSize,
          query,
          sortBy,
          sortByAction,
        },
      });
      return (response.data as ApiResponse).data;
    },
    enabled: Boolean(seasonId),
  });
};
