import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { Badge } from "@/components/ui/badge";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatDisplayAmount } from "@/utils/displayLocale";
import type { Employee } from "../schemas/employee";

export function getEmployeeColumns(
  t: TFunction,
  locale = "en-US",
): ColumnDef<Employee>[] {
  return [
    { accessorKey: "employeeNo", header: t("common:employee_no") },
    { accessorKey: "name", header: t("common:name") },
    { accessorKey: "position", header: t("common:position") },
    { accessorKey: "phoneNo", header: t("common:phone_number") },
    {
      accessorKey: "monthlySalary",
      header: t("common:monthly_salary"),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatDisplayAmount(row.original.monthlySalary, locale)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t("common:status"),
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "default" : "secondary"}>
          {t(`common:${row.original.status}`)}
        </Badge>
      ),
    },
    {
      accessorKey: "joinDate",
      header: t("common:hire_date"),
      cell: ({ row }) => dateFormatter(row.original.joinDate),
    },
  ];
}
