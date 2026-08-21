import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { useSeasonScope } from "@/features/admin/seasons/SeasonScopeProvider";
import type { PaginatedResponse } from "@/types";
import type { CashDashboard } from "../../cash/schemas/cash";
import type { EnteringPaddyDashboard } from "../../entering-paddy/schemas/entering-paddy-dashboard";
import type { EmployeeDashboard } from "../../employees/schemas/employee-dashboard";
import type { ExpenseDashboard } from "../../expenses/schemas/expense-dashboard";
import type { PaddyDashboard } from "../../paddy-warehouses/schemas/paddy-dashboard";
import type { RiceDashboard } from "../../rice-warehouses/schemas/rice-dashboard";

type ApiEnvelope<T> = {
  statusCode: number;
  message: string;
  data: T;
};

type SectionTotalKey =
  | "seasons"
  | "varieties"
  | "customers"
  | "enteringPaddy"
  | "companyPaddy"
  | "farmerPaddy"
  | "paddyProcess"
  | "riceWarehouse"
  | "processRice"
  | "riceSales"
  | "stores"
  | "expenses"
  | "employees"
  | "investors"
  | "jwali"
  | "sarafi"
  | "currencies";

type CurrencyCashPaidSummary = {
  seasonId: string;
  cashPaidAmount?: string;
  byCurrency: Array<{
    currencyCode: string;
    currencyName: string;
    cashPaidAmount: string;
  }>;
};

type SarafCashSummary = {
  seasonId: string;
  byCurrency: Array<{
    currencyCode: string;
    currencyName: string;
    cashIn: string;
    cashOut: string;
  }>;
};

type BuyerTransfersSummary = {
  seasonId: string;
  transferCount: string;
  byCurrency: Array<{
    currencyId: string;
    currencyCode: string;
    currencyName: string;
    paidOnBehalfTotal: string;
    receivedOnBehalfTotal: string;
  }>;
};

export type GeneralDashboardData = {
  enteringPaddy: EnteringPaddyDashboard | null;
  paddyWarehouse: PaddyDashboard | null;
  riceWarehouse: RiceDashboard | null;
  riceSalesCashSummary: CurrencyCashPaidSummary | null;
  storeCashSummary: CurrencyCashPaidSummary | null;
  jwaliCashSummary: CurrencyCashPaidSummary | null;
  expenseCashSummary: CurrencyCashPaidSummary | null;
  paddyCashSummary: CurrencyCashPaidSummary | null;
  sarafCashSummary: SarafCashSummary | null;
  cashDashboard: CashDashboard | null;
  buyerTransfersSummary: BuyerTransfersSummary | null;
  expenses: ExpenseDashboard | null;
  employees: EmployeeDashboard | null;
  sectionTotals: Record<SectionTotalKey, number | null>;
};

async function safeGetPayload<T>(endpoint: string, params?: Record<string, unknown>) {
  try {
    const response = await apiClient.get(endpoint, { params });
    return (response.data as ApiEnvelope<T>).data;
  } catch {
    return null;
  }
}

async function safeGetTotalCount(endpoint: string, params?: Record<string, unknown>) {
  const data = await safeGetPayload<PaginatedResponse<unknown>>(endpoint, {
    pageNumber: 1,
    pageSize: 1,
    ...params,
  });
  return data?.totalCount ?? null;
}

export function useGeneralDashboard() {
  const { selectedSeasonId } = useSeasonScope();

  return useQuery<GeneralDashboardData>({
    queryKey: ["general-dashboard", selectedSeasonId],
    queryFn: async () => {
      const seasonParams = selectedSeasonId ? { seasonId: selectedSeasonId } : undefined;

      const [
        enteringPaddy,
        paddyWarehouse,
        riceWarehouse,
        riceSalesCashSummary,
        storeCashSummary,
        jwaliCashSummary,
        expenseCashSummary,
        paddyCashSummary,
        sarafCashSummary,
        cashDashboard,
        buyerTransfersSummary,
        expenses,
        employees,
        seasons,
        customers,
        enteringPaddyTotal,
        companyPaddy,
        farmerPaddy,
        paddyProcess,
        riceWarehouseTotal,
        processRice,
        riceSales,
        expensesTotal,
        employeesTotal,
        investorsTotal,
        jwali,
        sarafi,
        currencies,
      ] = await Promise.all([
        safeGetPayload<EnteringPaddyDashboard>("entering_paddy/dashboard"),
        safeGetPayload<PaddyDashboard>("campany_owned_paddy/dashboard"),
        safeGetPayload<RiceDashboard>("rice_warehouse/dashboard"),
        safeGetPayload<CurrencyCashPaidSummary>("rice_sales/cash-summary", seasonParams),
        safeGetPayload<CurrencyCashPaidSummary>("stores/variety-sales/cash-summary", seasonParams),
        safeGetPayload<CurrencyCashPaidSummary>("jwali/payments/cash-summary", seasonParams),
        safeGetPayload<CurrencyCashPaidSummary>("expenses/cash-summary", seasonParams),
        safeGetPayload<CurrencyCashPaidSummary>("campany_owned_paddy/cash-summary", seasonParams),
        safeGetPayload<SarafCashSummary>("sarafi/cash-summary", seasonParams),
        safeGetPayload<CashDashboard>("cash/dashboard", seasonParams),
        safeGetPayload<BuyerTransfersSummary>("customers/buyer-transfers-summary", seasonParams),
        safeGetPayload<ExpenseDashboard>("expenses/dashboard", seasonParams),
        safeGetPayload<EmployeeDashboard>("employees/dashboard"),
        safeGetTotalCount("seasons"),
        safeGetTotalCount("customers"),
        safeGetTotalCount("entering_paddy"),
        safeGetTotalCount("campany_owned_paddy"),
        safeGetTotalCount("farmer_owned_paddy"),
        safeGetTotalCount("paddy_process"),
        safeGetTotalCount("rice_warehouse"),
        safeGetTotalCount("process_rice"),
        safeGetTotalCount("rice_sales"),
        safeGetTotalCount("expenses"),
        safeGetTotalCount("employees"),
        safeGetTotalCount("investors"),
        safeGetTotalCount("jwali"),
        safeGetTotalCount("sarafi"),
        safeGetTotalCount("currencies"),
      ]);

      const [riceVarieties, paddyVarieties] = await Promise.all([
        safeGetTotalCount("varieties", { kind: "RICE" }),
        safeGetTotalCount("varieties", { kind: "PADDY" }),
      ]);

      const [shortGreenStore, regectionStore, brokenRiceStore, wasteStore] = await Promise.all([
        safeGetTotalCount("stores", { storeType: "short_green" }),
        safeGetTotalCount("stores", { storeType: "regection" }),
        safeGetTotalCount("stores", { storeType: "broken_rice" }),
        safeGetTotalCount("stores", { storeType: "waste" }),
      ]);

      const varietyParts = [riceVarieties, paddyVarieties].filter(
        (value): value is number => value !== null,
      );
      const storeParts = [shortGreenStore, regectionStore, brokenRiceStore, wasteStore].filter(
        (value): value is number => value !== null,
      );

      return {
        enteringPaddy,
        paddyWarehouse,
        riceWarehouse,
        riceSalesCashSummary,
        storeCashSummary,
        jwaliCashSummary,
        expenseCashSummary,
        paddyCashSummary,
        sarafCashSummary,
        cashDashboard,
        buyerTransfersSummary,
        expenses,
        employees,
        sectionTotals: {
          seasons,
          varieties: varietyParts.length > 0 ? varietyParts.reduce((sum, item) => sum + item, 0) : null,
          customers,
          enteringPaddy: enteringPaddyTotal,
          companyPaddy,
          farmerPaddy,
          paddyProcess,
          riceWarehouse: riceWarehouseTotal,
          processRice,
          riceSales,
          stores: storeParts.length > 0 ? storeParts.reduce((sum, item) => sum + item, 0) : null,
          expenses: expensesTotal,
          employees: employeesTotal,
          investors: investorsTotal,
          jwali,
          sarafi,
          currencies,
        },
      };
    },
    enabled: Boolean(selectedSeasonId),
  });
}
