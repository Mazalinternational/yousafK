export class RiceDashboardSeasonDto {
  id: string;
  name: string;
  status: 'ACTIVE' | 'CLOSED';
  startDate: Date;
  endDate?: Date | null;
}

export class RiceDashboardMetricDto {
  label: string;
  value: string;
  unit: 'kg' | 'ton' | 'seven_kg' | 'amount' | 'count';
}

export class RiceDashboardSummaryDto {
  totalInKg: string;
  totalInTon: string;
  totalOutKg: string;
  totalOutTon: string;
  currentStockKg: string;
  currentStockTon: string;
  entryCount: number;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  unpaidEntryCount: number;
  /** Buyer rice sales: invoice totals and settlement. */
  buyerSalesTotalAmount: string;
  buyerSalesPaidAmount: string;
  buyerSalesRemainingAmount: string;
  /** Combined receivable: stock purchases remaining + buyer sale remaining. */
  combinedRemainingAmount: string;
  /** Rice distributed via charity (no payment). */
  charityOutKg: string;
  /** Total rice owed to paddy farmers (ledger obligations). */
  totalFarmerRiceObligationKg: string;
  /** Total rice recorded as returned to farmers (issued from warehouse stock). */
  totalFarmerRiceReturnedKg: string;
  /** Net rice still to issue to farmers: obligation minus returns, by variety. */
  totalFarmerRiceToIssueKg: string;
}

export class RiceDashboardMovementPointDto {
  date: string;
  riceInKg: string;
  riceOutKg: string;
  netStockKg: string;
}

export class RiceDashboardVarietyStockDto {
  variety: string;
  /** Rice received via paddy process (process rice entries). */
  stockFromProcessKg: string;
  /** Rice received via rice warehouse (seller purchases). */
  warehouseInKg: string;
  totalInKg: string;
  totalOutKg: string;
  currentStockKg: string;
  currentStockTon: string;
  sellableStockKg: string;
  entryCount: number;
  /** Rice owed to farmers for this variety (farmer_obligation ledger entries). */
  farmerRiceObligationKg: string;
  /** Rice returned to farmers for this variety (fulfilled farmer_rice_return entries). */
  farmerRiceReturnedKg: string;
  /** Net rice still to issue: obligation minus returns for this variety. */
  farmerRiceToIssueKg: string;
}

export class RiceDashboardRecentMovementDto {
  id: string;
  type:
    | 'rice_entry'
    | 'process_rice_in'
    | 'farmer_exchange_issue'
    | 'buyer_sale'
    | 'rice_charity';
  ownerName: string;
  date: Date;
  variety: string;
  quantityKg: string;
  quantityTon: string;
  totalAmount?: string | null;
  paidAmount?: string | null;
  remainingAmount?: string | null;
  paymentType?: string | null;
  paidInCash?: boolean | null;
  paymentChannel?: 'cash' | 'saraf' | null;
  sarafName?: string | null;
  billNo?: string | null;
}

export class RiceDashboardDto {
  season: RiceDashboardSeasonDto | null;
  overview: RiceDashboardMetricDto[];
  summary: RiceDashboardSummaryDto;
  movementSeries: RiceDashboardMovementPointDto[];
  varietyBreakdown: RiceDashboardVarietyStockDto[];
  recentMovements: RiceDashboardRecentMovementDto[];
}
