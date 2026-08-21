import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import type { CustomerAccount } from "../schemas/customer";

type CustomerAccountApiResponse = {
  statusCode: number;
  message: string;
  data: CustomerAccount;
};

export const useCustomerAccount = (customerId?: string) => {
  return useQuery<CustomerAccount>({
    queryKey: ["customer-account", customerId],
    enabled: Boolean(customerId),
    queryFn: async () => {
      const response = await apiClient.get(`/customers/${customerId}/account`);

      return (response.data as CustomerAccountApiResponse).data;
    },
  });
};
