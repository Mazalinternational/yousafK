export class UpdateEmployeeDto {
  name?: string;
  position?: string;
  phoneNo?: string;
  address?: string;
  joinDate?: string;
  monthlySalary?: string | number;
  status?: 'active' | 'inactive';
  notes?: string | null;
}
