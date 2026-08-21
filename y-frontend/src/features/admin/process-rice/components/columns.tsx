import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatQuantityWithUnit } from "@/utils/weightUnit";
import type { ProcessRice } from "../schemas/process-rice";

export function getProcessRiceColumns(t: TFunction): ColumnDef<ProcessRice>[] {
  return [
    { accessorKey: "billNo", header: t("common:rice_bill_no") },
    { accessorKey: "processedBillNo", header: t("common:processed_bill_no") },
    {
      accessorKey: "date",
      header: t("common:date"),
      cell: ({ row }) => dateFormatter(row.original.date),
    },
    { accessorKey: "variety", header: t("common:rice_variety") },
    {
      accessorKey: "weight",
      header: t("common:weight"),
      cell: ({ row }) =>
        formatQuantityWithUnit(row.original.weight, row.original.unit, t),
    },
    { accessorKey: "seasonName", header: t("common:season") },
  ];
}
