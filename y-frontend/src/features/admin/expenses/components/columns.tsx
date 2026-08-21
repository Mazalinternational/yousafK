import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatDisplayAmount } from "@/utils/displayLocale";
import type { Expense } from "../schemas/expense";

export function getExpenseColumns(t: TFunction, locale = "en-US"): ColumnDef<Expense>[] {
  return [
    { accessorKey: "billNo", header: t("common:expense_bill_no") },
    {
      accessorKey: "date",
      header: t("common:date"),
      cell: ({ row }) => dateFormatter(row.original.date),
    },
    {
      accessorKey: "categoryName",
      header: t("common:category"),
      cell: ({ row }) => row.original.categoryName,
    },
    { accessorKey: "title", header: t("common:expense_title") },
    {
      accessorKey: "currencyCode",
      header: t("common:currency"),
      cell: ({ row }) => row.original.currencyCode,
    },
    {
      accessorKey: "amount",
      header: t("common:amount"),
      cell: ({ row }) => formatDisplayAmount(row.original.amount, locale),
    },
    {
      id: "settlement",
      header: t("common:expense_settlement_mode"),
      cell: ({ row }) => {
        if (row.original.settlementMode === "vendor") {
          const vendorLabel = row.original.vendorName
            ? `${t("common:expense_settlement_vendor")} — ${row.original.vendorName}`
            : t("common:expense_settlement_vendor");
          return vendorLabel;
        }
        return t("common:expense_settlement_direct");
      },
    },
    {
      id: "paidVia",
      header: t("common:jwali_paid_via"),
      cell: ({ row }) => {
        if (
          row.original.settlementMode === "vendor" &&
          row.original.paymentType === "remaining"
        ) {
          return t("common:remaining");
        }
        if (row.original.paymentChannel === "saraf" && row.original.sarafName) {
          return `${t("common:jwali_paid_by_saraf")} — ${row.original.sarafName}`;
        }
        if (row.original.paymentChannel === "saraf") {
          return t("common:jwali_paid_by_saraf");
        }
        return t("common:jwali_paid_by_cash");
      },
    },
    { accessorKey: "seasonName", header: t("common:season") },
  ];
}
