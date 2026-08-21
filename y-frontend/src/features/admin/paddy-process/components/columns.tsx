import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { dateFormatter } from "@/utils/dataFormatters";
import { formatQuantityWithUnit, formatWeightFromKg } from "@/utils/weightUnit";
import type { PaddyProcess } from "../schemas/paddy-process";
import {
  getPaddyProcessOwnerName,
  getPaddyProcessSourceBillNo,
  getPaddyProcessStockTypeLabel,
  getPaddyProcessVarietyLabel,
} from "../utils/paddy-process-display";
import { PaddyProcessStatusBadges } from "./PaddyProcessStatusBadges";

export function getPaddyProcessColumns(t: TFunction): ColumnDef<PaddyProcess>[] {
  return [
    {
      accessorKey: "billNo",
      header: t("common:process_bill_no"),
    },
    {
      accessorKey: "date",
      header: t("common:date"),
      cell: ({ row }) => dateFormatter(row.original.date),
    },
    {
      accessorKey: "variety",
      header: t("common:variety"),
      cell: ({ row }) => getPaddyProcessVarietyLabel(row.original, t),
    },
    {
      id: "processStates",
      header: t("common:process_output_states"),
      cell: ({ row }) => <PaddyProcessStatusBadges process={row.original} t={t} compact />,
    },
    {
      accessorKey: "endDate",
      header: t("common:end_date"),
      cell: ({ row }) => (row.original.endDate ? dateFormatter(row.original.endDate) : "-"),
    },
    {
      id: "stockSourceType",
      header: t("common:stock_type"),
      cell: ({ row }) => getPaddyProcessStockTypeLabel(row.original, t),
    },
    {
      id: "sourceBillNo",
      header: t("common:warehouse_bill_no"),
      cell: ({ row }) => getPaddyProcessSourceBillNo(row.original),
    },
    {
      id: "sourceOwnerName",
      header: t("common:owner_name"),
      cell: ({ row }) => getPaddyProcessOwnerName(row.original),
    },
    {
      accessorKey: "weight",
      header: t("common:weight"),
      cell: ({ row }) =>
        formatQuantityWithUnit(row.original.weight, row.original.unit, t),
    },
    {
      accessorKey: "processedWeightKg",
      header: t("common:processed_weight_kg"),
      cell: ({ row }) => formatWeightFromKg(row.original.processedWeightKg, t),
    },
    {
      accessorKey: "seasonName",
      header: t("common:season"),
    },
  ];
}
