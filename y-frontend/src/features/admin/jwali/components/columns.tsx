import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import type { Jwali } from "../schemas/jwali";

export function getJwaliColumns(t: TFunction): ColumnDef<Jwali>[] {
  return [
    { accessorKey: "name", header: t("common:name") },
    { accessorKey: "phoneNo", header: t("common:phone_number") },
    { accessorKey: "address", header: t("common:address") },
  ];
}
