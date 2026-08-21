export class SeasonDataDto {
  id: string;
  name: string;
  code?: string | null;
  startDate: Date;
  endDate?: Date | null;
  status: 'ACTIVE' | 'CLOSED';
  closingNotes?: string | null;
  totalSales: string;
  totalExpenses: string;
  totalPurchases: string;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
