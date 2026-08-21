import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatQuantityWithUnit } from "@/utils/weightUnit";
import type { RiceSale } from "../schemas/rice-sale";

export function getRiceSaleColumns(t: TFunction): ColumnDef<RiceSale>[] {
  return [
    {
      accessorKey: "billNo",
      header: t("common:bill_no"),
    },
    {
      id: "buyer",
      header: t("common:buyer"),
      cell: ({ row }) => row.original.buyerCustomer?.name ?? "—",
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
      accessorKey: "totalAmount",
      header: t("common:rice_sale_rice_amount"),
    },
    {
      id: "invoiceTotal",
      header: t("common:rice_sale_invoice_total"),
      cell: ({ row }) => row.original.invoiceTotal ?? row.original.totalAmount,
    },
    {
      id: "payment",
      header: t("common:payment"),
      cell: ({ row }) => {
        const bits: string[] = [];
        if (row.original.paymentType) {
          bits.push(t(`common:${row.original.paymentType}`));
        }
        if (row.original.paymentChannel === "saraf" && row.original.saraf?.name) {
          bits.push(`${t("common:rice_sale_route_saraf")}: ${row.original.saraf.name}`);
        } else if (row.original.paymentChannel === "cash" && row.original.paidInCash) {
          bits.push(t("common:rice_sale_cash"));
        } else if (row.original.paymentChannel === "saraf") {
          bits.push(t("common:rice_sale_route_saraf"));
        }
        return bits.length ? bits.join(" · ") : "—";
      },
    },
    {
      accessorKey: "saleDate",
      header: t("common:date"),
      cell: ({ row }) => dateFormatter(row.original.saleDate),
    },
    {
      accessorKey: "seasonName",
      header: t("common:season"),
    },
  ];
}
