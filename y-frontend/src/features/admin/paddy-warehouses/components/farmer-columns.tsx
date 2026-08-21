import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatQuantityWithUnit } from "@/utils/weightUnit";
import type { FarmerOwnedPaddyWarehouse } from "../schemas/farmer-owned-paddy-warehouse";

export function getFarmerOwnedPaddyWarehouseColumns(
  t: TFunction,
): ColumnDef<FarmerOwnedPaddyWarehouse>[] {
  return [
    {
      accessorKey: "receivedDate",
      header: t("common:received_date"),
      cell: ({ row }) => dateFormatter(row.original.receivedDate),
    },
    {
      accessorKey: "ownerName",
      header: t("common:owner_name"),
    },
    {
      accessorKey: "billNo",
      header: t("common:warehouse_bill_no"),
    },
    {
      accessorKey: "enteringBillNo",
      header: t("common:entering_bill_no"),
    },
    {
      accessorKey: "paddyVariety",
      header: t("common:paddy_variety"),
    },
    {
      accessorKey: "riceVariety",
      header: t("common:rice_variety"),
    },
    {
      accessorKey: "seasonName",
      header: t("common:season"),
    },
    {
      accessorKey: "paddyQuantity",
      header: t("common:paddy_quantity"),
      cell: ({ row }) =>
        formatQuantityWithUnit(row.original.paddyQuantity, row.original.unit, t),
    },
    {
      accessorKey: "riceQuantity",
      header: t("common:rice_quantity"),
      cell: ({ row }) =>
        formatQuantityWithUnit(row.original.riceQuantity, row.original.unit, t),
    },
  ];
}
