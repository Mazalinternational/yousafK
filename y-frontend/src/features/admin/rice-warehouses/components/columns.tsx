import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatQuantityWithUnit } from "@/utils/weightUnit";
import type { RiceWarehouse } from "../schemas/rice-warehouse";

const formatNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return Number(value).toLocaleString();
};

export function getRiceWarehouseColumns(
  t: TFunction,
): ColumnDef<RiceWarehouse>[] {
  return [
    {
      accessorKey: "billNo",
      header: t("common:bill_no"),
    },
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
      accessorKey: "variety",
      header: t("common:variety"),
    },
    {
      accessorKey: "seasonName",
      header: t("common:season"),
    },
    {
      accessorKey: "quantity",
      header: t("common:quantity"),
      cell: ({ row }) =>
        formatQuantityWithUnit(row.original.quantity, row.original.unit, t),
    },
    {
      accessorKey: "rate",
      header: t("common:rate"),
      cell: ({ row }) => formatNumber(row.original.rate),
    },
    {
      accessorKey: "totalAmount",
      header: t("common:total_amount"),
      cell: ({ row }) => formatNumber(row.original.totalAmount),
    },
    {
      accessorKey: "paidAmount",
      header: t("common:paid_amount"),
      cell: ({ row }) => formatNumber(row.original.paidAmount),
    },
    {
      accessorKey: "remainingAmount",
      header: t("common:remaining_amount"),
      cell: ({ row }) => formatNumber(row.original.remainingAmount),
    },
    {
      accessorKey: "paymentType",
      header: t("common:payment_type"),
      cell: ({ row }) => t(`common:${row.original.paymentType}`),
    },
    {
      id: "paymentRoute",
      header: t("common:jwali_payment_mode"),
      cell: ({ row }) => {
        if (row.original.paymentChannel === "saraf" && row.original.saraf?.name) {
          return `${t("common:jwali_paid_by_saraf")} — ${row.original.saraf.name}`;
        }
        if (row.original.paymentChannel === "cash") {
          const code = row.original.sarafLedgerCurrency?.code;
          return code
            ? `${t("common:jwali_paid_by_cash")} (${code})`
            : t("common:jwali_paid_by_cash");
        }
        return t("common:jwali_paid_by_cash");
      },
    },
  ];
}
