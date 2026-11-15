import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import type { Customer } from "../../customer/schemas/customer";

type CustomerListApiResponse = {
  statusCode: number;
  message: string;
  data: PaginatedResponse<Customer>;
};

const PAGE_SIZE = 500;
const ENTERING_PADDY_CUSTOMER_TYPES = ["paddy_farmer", "paddy_seller"] as const;

async function fetchCustomersPage(params: {
  pageNumber: number;
  pageSize: number;
  type: (typeof ENTERING_PADDY_CUSTOMER_TYPES)[number];
  seasonId?: string;
}): Promise<PaginatedResponse<Customer>> {
  const response = await apiClient.get("customers", {
    params: {
      pageNumber: params.pageNumber,
      pageSize: params.pageSize,
      type: params.type,
      // Avoid WAF false-positives on sortBy=name; sort client-side.
      sortBy: "createdAt",
      sortByAction: "desc",
      seasonId: params.seasonId || undefined,
    },
  });
  return (response.data as CustomerListApiResponse).data;
}

async function fetchAllCustomersOfType(params: {
  type: (typeof ENTERING_PADDY_CUSTOMER_TYPES)[number];
  seasonId?: string;
}): Promise<Customer[]> {
  const first = await fetchCustomersPage({
    pageNumber: 1,
    pageSize: PAGE_SIZE,
    type: params.type,
    seasonId: params.seasonId,
  });
  const items = [...(first.items ?? [])];
  const totalPages = Math.max(1, first.totalPages || 1);

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await fetchCustomersPage({
      pageNumber: page,
      pageSize: PAGE_SIZE,
      type: params.type,
      seasonId: params.seasonId,
    });
    items.push(...(next.items ?? []));
  }

  return items;
}

/**
 * Loads every paddy_farmer and paddy_seller for the selected season.
 * Paginates past the API pageSize window so newly registered accounts
 * are not dropped from the entering-paddy dropdown.
 */
export function useEnteringPaddyCustomers(enabled = true) {
  const { selectedSeasonId } = useSeasonScope();
  const seasonId = selectedSeasonId ?? undefined;

  const results = useQueries({
    queries: ENTERING_PADDY_CUSTOMER_TYPES.map((type) => ({
      queryKey: ["customers", "entering-paddy", selectedSeasonId, type],
      queryFn: () => fetchAllCustomersOfType({ type, seasonId }),
      enabled: Boolean(enabled && selectedSeasonId),
    })),
  });

  const customers = useMemo(() => {
    const merged = results.flatMap((result) => result.data ?? []);
    const byId = new Map<string, Customer>();
    for (const customer of merged) {
      byId.set(customer.id, customer);
    }
    return [...byId.values()].sort((left, right) =>
      left.name.localeCompare(right.name, "fa"),
    );
  }, [results]);

  return {
    customers,
    isLoading: results.some((result) => result.isLoading || result.isPending),
    isFetching: results.some((result) => result.isFetching),
    isError: results.some((result) => result.isError),
    refetch: async () => {
      await Promise.all(results.map((result) => result.refetch()));
    },
  };
}
