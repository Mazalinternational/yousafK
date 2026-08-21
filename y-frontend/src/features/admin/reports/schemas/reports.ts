export type ReportPreset = "day" | "week" | "month";

export type ReportSeason = {
  id: string;
  name: string;
  code: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
};

/** One serialized row from the reports API (dates ISO strings, decimals as strings). */
export type ReportDetailRow = Record<string, unknown>;

export type ReportStockSnapshot = {
  entering_paddy: {
    totalEnteredKg: string;
    totalRemainingKg: string;
    entryCount: number;
  } | null;
  paddy_warehouse: {
    companyAvailableKg: string;
    farmerPaddyKg: string;
    totalStockKg: string;
    varieties: Array<{
      variety: string;
      companyWeightKg: string;
      farmerWeightKg: string;
      totalWeightKg: string;
    }>;
  } | null;
  paddy_process: {
    availableCompanyPaddyKg: string;
    processedTotalKg: string;
  } | null;
  rice_warehouse: {
    currentStockKg: string;
    varieties: Array<{ variety: string; currentStockKg: string }>;
  } | null;
  process_rice: {
    note: string;
    linkedRiceStockKg: string;
  } | null;
  store: {
    totalAvailableKg: string;
    byStoreType: Array<{
      storeType: string;
      totalWeightKg: string;
      soldWeightKg: string;
      availableWeightKg: string;
    }>;
  } | null;
  cash: {
    byCurrency: Array<{
      currencyCode: string;
      currencyName: string;
      cashIn: string;
      cashOut: string;
      balance: string;
      transactionCount: number;
    }>;
  } | null;
  sarafi: {
    byCurrency: Array<{
      currencyCode: string;
      currencyName: string;
      balance: string;
      entryCount: number;
    }>;
  } | null;
};

export type ReportSummary = {
  range: {
    preset: ReportPreset;
    start: string;
    end: string;
  };
  entryLimit?: number;
  season: ReportSeason | null;
  stock: ReportStockSnapshot | null;
  sections: {
    entering_paddy: {
      recordCount: number;
      totalWeightKg: string | null;
      stock?: ReportStockSnapshot["entering_paddy"];
      entries?: ReportDetailRow[];
    } | null;
    paddy_warehouse: {
      stock?: ReportStockSnapshot["paddy_warehouse"];
      companyOwned: {
        recordCount: number;
        totalQuantity: string | null;
        totalAmount: string | null;
        entries?: ReportDetailRow[];
      } | null;
      farmerOwned: {
        recordCount: number;
        totalPaddyQuantity: string | null;
        totalRiceQuantity: string | null;
        entries?: ReportDetailRow[];
      } | null;
    } | null;
    paddy_process: {
      recordCount: number;
      totalWeight: string | null;
      totalProcessedWeightKg: string | null;
      stock?: ReportStockSnapshot["paddy_process"];
      entries?: ReportDetailRow[];
    } | null;
    rice_warehouse: {
      recordCount: number;
      totalQuantity: string | null;
      totalAmount: string | null;
      stock?: ReportStockSnapshot["rice_warehouse"];
      entries?: ReportDetailRow[];
    } | null;
    process_rice: {
      recordCount: number;
      totalWeight: string | null;
      totalProcessedWeightKg: string | null;
      stock?: ReportStockSnapshot["process_rice"];
      entries?: ReportDetailRow[];
    } | null;
    rice_sales: {
      recordCount: number;
      totalQuantity: string | null;
      entries?: ReportDetailRow[];
    } | null;
    rice_charities: {
      recordCount: number;
      totalQuantity: string | null;
      entries?: ReportDetailRow[];
    } | null;
    store: {
      entryCount: number;
      byStoreType: Record<
        string,
        {
          recordCount: number;
          totalWeight: string | null;
          totalProcessedWeightKg: string | null;
        }
      >;
      saleCount: number;
      totalSoldWeightKg: string | null;
      totalSaleAmount: string | null;
      salesByStoreType: Record<
        string,
        {
          saleCount: number;
          totalSoldWeight: string | null;
          totalSoldWeightKg: string | null;
          totalSaleAmount: string | null;
        }
      >;
      stock?: ReportStockSnapshot["store"];
      entries?: ReportDetailRow[];
      sales?: ReportDetailRow[];
    } | null;
    cash: {
      entryCount: number;
      byCurrency: Array<{
        currencyCode: string;
        currencyName: string;
        entryCount: number;
        cashIn: string | null;
        cashOut: string | null;
      }>;
      stock?: ReportStockSnapshot["cash"];
      entries?: ReportDetailRow[];
    } | null;
    expenses: {
      byCurrency: Array<{
        currencyCode: string;
        currencyName: string;
        entryCount: number;
        totalAmount: string | null;
      }>;
      entries?: ReportDetailRow[];
    } | null;
    jwali: {
      entryCount: number;
      totalAmount: string | null;
      entries?: ReportDetailRow[];
    } | null;
    sarafi: {
      entryCount: number;
      byCurrency: Array<{
        currencyCode: string;
        currencyName: string;
        entryCount: number;
        totalAmount: string | null;
      }>;
      stock?: ReportStockSnapshot["sarafi"];
      entries?: ReportDetailRow[];
    } | null;
  };
};
