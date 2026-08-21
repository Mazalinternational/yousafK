import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatQuantityWithUnit } from "@/utils/weightUnit";
import type { RiceCharity } from "../schemas/rice-charity";

export function getRiceCharityColumns(t: TFunction): ColumnDef<RiceCharity>[] {
  return [
    {
      accessorKey: "billNo",
      header: t("common:bill_no"),
    },
    {
      accessorKey: "recipientName",
      header: t("common:rice_charity_recipient"),
    },
    {
      accessorKey: "riceVariety",
      header: t("common:rice_variety"),
    },
    {
      id: "quantity",
      header: t("common:quantity"),
      cell: ({ row }) =>
        formatQuantityWithUnit(row.original.quantity, row.original.unit, t),
    },
    {
      accessorKey: "charityDate",
      header: t("common:date"),
      cell: ({ row }) => dateFormatter(row.original.charityDate),
    },
    {
      accessorKey: "seasonName",
      header: t("common:season"),
    },
  ];
}
