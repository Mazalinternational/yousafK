import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { getLocalizedCurrencyName } from "@/utils/currencyDisplay";
import type { Currency } from "../schemas/currency";

export function getCurrencyColumns(t: TFunction): ColumnDef<Currency>[] {
  return [
    {
      accessorKey: "code",
      header: t("common:currency_code"),
      cell: ({ row }) => <span className="tabular-nums">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: t("common:currency_name"),
      cell: ({ row }) =>
        getLocalizedCurrencyName(row.original.code, row.original.name, t),
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
