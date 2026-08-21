import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatQuantityWithUnit } from "@/utils/weightUnit";
import type { StoreEntry } from "../schemas/store";

export function getStoreColumns(t: TFunction): ColumnDef<StoreEntry>[] {
  return [
    {
      accessorKey: "billNo",
      header: t("common:store_entry_bill_no"),
    },
    {
      accessorKey: "processBillNo",
      header: t("common:reference_process_bill_no"),
    },
    {
      accessorKey: "date",
      header: t("common:date"),
      cell: ({ row }) => dateFormatter(row.original.date),
    },
    {
      accessorKey: "variety",
      header: t("common:variety"),
    },
    {
      accessorKey: "weight",
      header: t("common:weight"),
      cell: ({ row }) =>
        formatQuantityWithUnit(row.original.weight, row.original.unit, t),
    },
    {
      accessorKey: "ownerName",
      header: t("common:owner_name"),
    },
    {
      accessorKey: "seasonName",
      header: t("common:season"),
    },
  ];
}
