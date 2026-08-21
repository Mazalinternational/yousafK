import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import type { Saraf } from "../schemas/sarafi";

export function getSarafColumns(t: TFunction): ColumnDef<Saraf>[] {
  return [
    { accessorKey: "name", header: t("common:name") },
    { accessorKey: "phoneNo", header: t("common:phone_number") },
    { accessorKey: "address", header: t("common:address") },
  ];
}
