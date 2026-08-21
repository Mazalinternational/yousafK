import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Customer } from "../schemas/customer";

type CustomerListApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<Customer>;
};

const fetchReceivablePaddySellers = async (
  seasonId: string,
): Promise<PaginatedResponse<Customer>> => {
  const response = await apiClient.get("customers", {
    params: {
      pageNumber: 1,
      pageSize: 500,
      seasonId,
      type: "paddy_seller",
      sortBy: "name",
      sortDirection: "asc",
    },
  });

  return (response.data as CustomerListApiResponse).data;
};

export const useReceivablePaddySellers = (
  seasonId?: string,
  excludeCustomerId?: string,
) => {
  const query = useQuery({
    queryKey: ["receivable-paddy-sellers", seasonId],
    queryFn: () => fetchReceivablePaddySellers(seasonId!),
    enabled: Boolean(seasonId),
  });

  const options = useMemo(() => {
    const seen = new Set<string>();
    const merged: { value: string; label: string }[] = [];

    for (const customer of query.data?.items ?? []) {
      if (customer.id === excludeCustomerId || seen.has(customer.id)) {
        continue;
      }

      seen.add(customer.id);
      merged.push({ value: customer.id, label: customer.name });
    }

    return merged.sort((a, b) => a.label.localeCompare(b.label));
  }, [query.data?.items, excludeCustomerId]);

  return {
    options,
    isLoading: query.isLoading || query.isFetching,
  };
};
