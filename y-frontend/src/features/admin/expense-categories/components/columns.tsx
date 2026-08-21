import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import type { ExpenseCategory } from "../schemas/expense-category";

export function getExpenseCategoryColumns(t: TFunction): ColumnDef<ExpenseCategory>[] {
  return [
    {
      accessorKey: "code",
      header: t("common:expense_category_code"),
    },
    {
      accessorKey: "name",
      header: t("common:name"),
    },
    {
      accessorKey: "isActive",
      header: t("common:status"),
      cell: ({ row }) =>
        row.original.isActive ? t("common:active") : t("common:inactive"),
    },
    {
      accessorKey: "createdAt",
      header: t("common:date"),
      cell: ({ row }) => dateFormatter(row.original.createdAt),
    },
  ];
}
