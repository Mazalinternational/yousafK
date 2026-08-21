import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatQuantityWithUnit } from "@/utils/weightUnit";
import type { PaddyWarehouse } from "../schemas/paddy-warehouse";

const formatNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return Number(value).toLocaleString();
};

export function getPaddyWarehouseColumns(
  t: TFunction,
): ColumnDef<PaddyWarehouse>[] {
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
      accessorKey: "variety",
      header: t("common:variety"),
    },
    {
      accessorKey: "seasonName",
      header: t("common:season"),
    },
    {
      accessorKey: "processingStatus",
      header: t("common:processing_status"),
      cell: ({ row }) =>
        row.original.processingStatus
          ? t(`common:${row.original.processingStatus}`)
          : "-",
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
      id: "sellerPayment",
      header: t("common:payment"),
      cell: ({ row }) => {
        const bits: string[] = [];
        bits.push(t(`common:${row.original.paymentType}`));
        if (row.original.paymentChannel === "saraf" && row.original.saraf?.name) {
          bits.push(`${t("common:rice_sale_route_saraf")}: ${row.original.saraf.name}`);
        } else if (row.original.paymentChannel === "saraf") {
          bits.push(t("common:rice_sale_route_saraf"));
        } else {
          bits.push(t("common:rice_sale_route_cash"));
        }
        return bits.join(" · ");
      },
    },
  ];
}
