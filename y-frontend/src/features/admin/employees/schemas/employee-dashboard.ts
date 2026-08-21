import z from "zod";

export const EmployeeDashboardMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  unit: z.enum(["amount", "count"]),
});

export const EmployeeDashboardSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
});

export const EmployeeDashboardEmployeeSchema = z.object({
  id: z.string(),
  employeeNo: z.string(),
  name: z.string(),
  position: z.string(),
  status: z.enum(["active", "inactive"]),
  paymentStatus: z.enum(["paid", "partial_paid", "remaining"]),
  phoneNo: z.string(),
  monthlySalary: z.string(),
  payableThisMonth: z.string(),
  paidThisMonth: z.string(),
  deductionsThisMonth: z.string(),
  remainingAmount: z.string(),
  weOweEmployeeAmount: z.string(),
  lastPaymentDate: z.string().nullable().optional(),
});

export const EmployeeDashboardSchema = z.object({
  season: EmployeeDashboardSeasonSchema.nullable(),
  overview: z.array(EmployeeDashboardMetricSchema),
  paidEmployees: z.array(EmployeeDashboardEmployeeSchema),
  remainingEmployees: z.array(EmployeeDashboardEmployeeSchema),
});

export type EmployeeDashboard = z.infer<typeof EmployeeDashboardSchema>;
