import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import type { Customer } from "../schemas/customer";

export function getCustomerColumns(t: TFunction): ColumnDef<Customer>[] {
  return [
    {
      accessorKey: "name",
      header: t("common:name"),
    },
    {
      accessorKey: "type",
      header: t("common:type"),
      cell: ({ row }) => t(`common:${row.original.type}`),
    },
    {
      accessorKey: "phoneNo",
      header: t("common:phone_number"),
    },
    {
      accessorKey: "address",
      header: t("common:address"),
    },
    {
      accessorKey: "seasonName",
      header: t("common:season"),
    },
    {
      accessorKey: "createdAt",
      header: t("common:date"),
      cell: ({ row }) => dateFormatter(row.original.createdAt),
    },
  ];
}
