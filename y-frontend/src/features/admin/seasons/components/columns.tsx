import { Badge } from "@/components/ui/badge";
import { dateFormatter } from "@/utils/dataFormatters";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import type { Season } from "../schemas/season";

export function getSeasonColumns(t: TFunction): ColumnDef<Season>[] {
  return [
    {
      accessorKey: "name",
      header: t("common:name"),
    },
    {
      accessorKey: "code",
      header: t("common:code"),
      cell: ({ row }) => row.original.code || "-",
    },
    {
      accessorKey: "startDate",
      header: t("common:start_date"),
      cell: ({ row }) => dateFormatter(row.original.startDate),
    },
    {
      accessorKey: "endDate",
      header: t("common:end_date"),
      cell: ({ row }) => dateFormatter(row.original.endDate),
    },
    {
      accessorKey: "status",
      header: t("common:status"),
      cell: ({ row }) => {
        const isActive = row.original.status === "ACTIVE";

        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? t("common:active") : t("common:closed")}
          </Badge>
        );
      },
    },
  ];
}
