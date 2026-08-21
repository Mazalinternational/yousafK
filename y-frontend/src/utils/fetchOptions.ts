import { apiClient } from "@/api/client";

export const fetchOptions = async <T>(
  route: string,
  query?: string,
  filters?: object
): Promise<T[]> => {
  const res = await apiClient.get(route, {
    params: {
      query,
      ...filters,
    },
  });
  return res.data.items;
};
