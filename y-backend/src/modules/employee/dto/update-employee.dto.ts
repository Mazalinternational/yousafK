export class UpdateEmployeeDto {
  name?: string;
  position?: string;
  phoneNo?: string;
  address?: string;
  joinDate?: string;
  monthlySalary?: string | number;
  /** Date the new monthly salary starts. Earlier days keep the previous salary. */
  salaryEffectiveDate?: string;
  /** Salary paid from the hire date until the day before salaryEffectiveDate. */
  earlierMonthlySalary?: string | number;
  status?: 'active' | 'inactive';
  notes?: string | null;
}
