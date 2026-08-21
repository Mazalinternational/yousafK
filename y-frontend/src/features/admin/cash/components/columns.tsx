import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { Badge } from "@/components/ui/badge";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatCurrencyTitle } from "@/utils/currencyDisplay";
import { formatDisplayAmount } from "@/utils/displayLocale";
import type { CashTransaction } from "../schemas/cash";

export function getCashTransactionColumns(
  t: TFunction,
  locale = "en-US",
): ColumnDef<CashTransaction>[] {
  return [
    {
      accessorKey: "occurredAt",
      header: t("common:date"),
      cell: ({ row }) => dateFormatter(row.original.occurredAt),
    },
    {
      accessorKey: "direction",
      header: t("common:cash_direction"),
      cell: ({ row }) => (
        <Badge variant={row.original.direction === "in" ? "default" : "secondary"}>
          {row.original.direction === "in"
            ? t("common:cash_in")
            : t("common:cash_out")}
        </Badge>
      ),
    },
    {
      accessorKey: "amount",
      header: t("common:amount"),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatDisplayAmount(row.original.amount, locale)} {row.original.currencyCode}
        </span>
      ),
    },
    {
      accessorKey: "currencyCode",
      header: t("common:currency"),
      cell: ({ row }) => (
        <span>
          {formatCurrencyTitle(row.original.currencyCode, row.original.currencyName, t)}
        </span>
      ),
    },
    {
      accessorKey: "notes",
      header: t("common:notes"),
      cell: ({ row }) => row.original.notes || "—",
    },
    {
      accessorKey: "seasonName",
      header: t("common:season"),
      cell: ({ row }) => row.original.seasonName || "—",
    },
  ];
}
