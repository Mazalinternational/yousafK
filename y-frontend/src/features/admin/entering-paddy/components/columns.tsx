import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { Badge } from "@/components/ui/badge";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatQuantityWithUnit, formatWeightFromKg } from "@/utils/weightUnit";
import type { EnteringPaddy } from "../schemas/entering-paddy";

export function getEnteringPaddyColumns(
  t: TFunction,
): ColumnDef<EnteringPaddy>[] {
  return [
    {
      accessorKey: "date",
      header: t("common:date"),
      cell: ({ row }) => dateFormatter(row.original.date),
    },
    {
      accessorKey: "billNo",
      header: t("common:bill_no"),
    },
    {
      accessorKey: "paddyOwner",
      header: t("common:paddy_owner"),
    },
    {
      accessorKey: "variety",
      header: t("common:variety"),
    },
    {
      accessorKey: "weight",
      header: t("common:weight"),
      cell: ({ row }) =>
        formatQuantityWithUnit(row.original.weight, row.original.weightUnit, t),
    },
    {
      accessorKey: "totalWeightKg",
      header: t("common:total_weight_kg"),
      cell: ({ row }) => formatWeightFromKg(row.original.totalWeightKg, t),
    },
    {
      accessorKey: "trackedQuantityKg",
      header: t("common:tracked_quantity_kg"),
      cell: ({ row }) =>
        row.original.trackedQuantityKg != null && row.original.trackedQuantityKg !== ""
          ? formatWeightFromKg(row.original.trackedQuantityKg, t)
          : "-",
    },
    {
      accessorKey: "remainingQuantityKg",
      header: t("common:remaining_quantity_kg"),
      cell: ({ row }) =>
        row.original.remainingQuantityKg != null && row.original.remainingQuantityKg !== ""
          ? formatWeightFromKg(row.original.remainingQuantityKg, t)
          : "-",
    },
    {
      accessorKey: "receivedFrom",
      header: t("common:received_from"),
      cell: ({ row }) => t(`common:${row.original.receivedFrom}`),
    },
    {
      accessorKey: "driverName",
      header: t("common:driver_name"),
    },
    {
      accessorKey: "trackedInWarehouse",
      header: t("common:warehouse_tracking"),
      cell: ({ row }) =>
        row.original.trackedInWarehouse ? (
          <Badge variant="default">
            {t(
              row.original.trackedStockType === "company"
                ? "common:tracked_company"
                : "common:tracked_farmer"
            )}
          </Badge>
        ) : (
          <Badge variant="secondary">{t("common:not_tracked")}</Badge>
        ),
    },
    {
      accessorKey: "carPlate",
      header: t("common:car_plate"),
    },
    {
      accessorKey: "seasonName",
      header: t("common:season"),
    },
  ];
}
