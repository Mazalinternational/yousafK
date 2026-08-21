import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

type PaddyProcessRecordsTableProps = {
  processes: PaddyProcess[];
  showSeason?: boolean;
};

export function PaddyProcessRecordsTable({
  processes,
  showSeason = false,
}: PaddyProcessRecordsTableProps) {
  const { t } = useTranslation();

  if (processes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("common:no_data")}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>{t("common:process_bill_no")}</TableHead>
            <TableHead>{t("common:date")}</TableHead>
            <TableHead>{t("common:variety")}</TableHead>
            <TableHead>{t("common:process_output_states")}</TableHead>
            <TableHead>{t("common:end_date")}</TableHead>
            <TableHead>{t("common:stock_type")}</TableHead>
            <TableHead>{t("common:warehouse_bill_no")}</TableHead>
            <TableHead>{t("common:owner_name")}</TableHead>
            <TableHead className="text-end">{t("common:weight")}</TableHead>
            <TableHead className="text-end">{t("common:processed_weight_kg")}</TableHead>
            {showSeason ? <TableHead>{t("common:season")}</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {processes.map((process) => (
            <TableRow key={process.id}>
              <TableCell className="font-medium tabular-nums">{process.billNo}</TableCell>
              <TableCell>{dateFormatter(process.date)}</TableCell>
              <TableCell>{getPaddyProcessVarietyLabel(process, t)}</TableCell>
              <TableCell>
                <PaddyProcessStatusBadges process={process} t={t} compact />
              </TableCell>
              <TableCell>
                {process.endDate ? dateFormatter(process.endDate) : "-"}
              </TableCell>
              <TableCell>{getPaddyProcessStockTypeLabel(process, t)}</TableCell>
              <TableCell className="tabular-nums">{getPaddyProcessSourceBillNo(process)}</TableCell>
              <TableCell>{getPaddyProcessOwnerName(process)}</TableCell>
              <TableCell className="text-end tabular-nums">
                {formatQuantityWithUnit(process.weight, process.unit, t)}
              </TableCell>
              <TableCell className="text-end tabular-nums">
                {formatWeightFromKg(process.processedWeightKg, t)}
              </TableCell>
              {showSeason ? <TableCell>{process.seasonName}</TableCell> : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
