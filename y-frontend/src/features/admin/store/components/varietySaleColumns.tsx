import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatDisplayAmount } from "@/utils/displayLocale";
import type { StoreVarietySale } from "../schemas/store-variety-sale";

export function getStoreVarietySaleColumns(
  t: TFunction,
  options?: { hideVariety?: boolean; locale?: string },
): ColumnDef<StoreVarietySale>[] {
  const locale = options?.locale ?? "en-US";
  const columns: ColumnDef<StoreVarietySale>[] = [
    { accessorKey: "billNo", header: t("common:bill_no") },
    {
      id: "buyer",
      header: t("common:buyer"),
      cell: ({ row }) => row.original.buyerCustomer?.name ?? "—",
    },
  ];

  if (!options?.hideVariety) {
    columns.push({ accessorKey: "variety", header: t("common:variety") });
  }

  columns.push(
    {
      id: "weight",
      header: t("common:weight"),
      cell: ({ row }) => `${row.original.soldWeight} ${row.original.unit}`,
    },
    { accessorKey: "saleAmount", header: t("common:sale_amount"), cell: ({ row }) => formatDisplayAmount(row.original.saleAmount, locale) },
    {
      id: "charges",
      header: t("common:rice_sale_section_charges"),
      cell: ({ row }) => {
        const loading = Number(row.original.loadingAmount ?? 0);
        const bags = Number(row.original.riceBagsAmount ?? 0);
        if (loading <= 0 && bags <= 0) {
          return "—";
        }
        const parts: string[] = [];
        if (loading > 0) {
          parts.push(`${t("common:rice_sale_loading_amount")}: ${formatDisplayAmount(row.original.loadingAmount, locale)}`);
        }
        if (bags > 0) {
          parts.push(`${t("common:rice_sale_bags_amount")}: ${formatDisplayAmount(row.original.riceBagsAmount, locale)}`);
        }
        return parts.join(" · ");
      },
    },
    {
      id: "invoiceTotal",
      header: t("common:rice_sale_invoice_total"),
      cell: ({ row }) => formatDisplayAmount(row.original.invoiceTotal ?? row.original.saleAmount, locale),
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
        } else if (row.original.paidInCash) {
          bits.push(t("common:rice_sale_cash"));
        }
        return bits.length ? bits.join(" · ") : "—";
      },
    },
    {
      accessorKey: "saleDate",
      header: t("common:date"),
      cell: ({ row }) => dateFormatter(row.original.saleDate),
    },
  );

  return columns;
}
