export class EmployeeDashboardMetricDto {
  label: string;
  value: string;
  unit: 'amount' | 'count';
}

export class EmployeeDashboardSeasonDto {
  id: string;
  name: string;
  status: 'ACTIVE' | 'CLOSED';
  startDate: Date;
  endDate?: Date | null;
}

export class EmployeeDashboardEmployeeDto {
  id: string;
  employeeNo: string;
  name: string;
  position: string;
  status: string;
  paymentStatus: 'paid' | 'partial_paid' | 'remaining';
  phoneNo: string;
  monthlySalary: string;
  paidThisMonth: string;
  remainingAmount: string;
  weOweEmployeeAmount: string;
  lastPaymentDate?: Date | null;
}

export class EmployeeDashboardDto {
  season: EmployeeDashboardSeasonDto | null;
  overview: EmployeeDashboardMetricDto[];
  paidEmployees: EmployeeDashboardEmployeeDto[];
  remainingEmployees: EmployeeDashboardEmployeeDto[];
}
