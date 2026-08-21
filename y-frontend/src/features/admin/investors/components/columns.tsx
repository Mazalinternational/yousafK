import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { Badge } from "@/components/ui/badge";
import { formatDisplayAmount } from "@/utils/displayLocale";
import type { Investor } from "../schemas/investor";

export function getInvestorColumns(
  t: TFunction,
  locale = "en-US",
): ColumnDef<Investor>[] {
  return [
    { accessorKey: "name", header: t("common:name") },
    { accessorKey: "phoneNo", header: t("common:phone_number") },
    {
      accessorKey: "sharePercentage",
      header: t("common:share_percentage"),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatDisplayAmount(row.original.sharePercentage, locale)}%
        </span>
      ),
    },
    {
      accessorKey: "investedAmount",
      header: t("common:invested_amount"),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatDisplayAmount(row.original.investedAmount, locale)}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: t("common:status"),
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? t("common:active") : t("common:inactive")}
        </Badge>
      ),
    },
  ];
}
