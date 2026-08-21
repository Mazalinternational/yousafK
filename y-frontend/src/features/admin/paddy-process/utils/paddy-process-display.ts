import type { TFunction } from "i18next";
import { POOLED_SALE_VARIETY } from "../../store/utils/storePooledTypes";
import type { PaddyProcess } from "../schemas/paddy-process";
import { isPaddyProcessFromStoreSource } from "./paddy-process-api";

export function getPaddyProcessVarietyLabel(
  process: Pick<PaddyProcess, "variety" | "stockSourceType">,
  t: TFunction,
) {
  if (isPaddyProcessFromStoreSource(process.stockSourceType)) {
    return t(`common:${process.stockSourceType}`);
  }

  if (process.variety === POOLED_SALE_VARIETY) {
    return "-";
  }

  return process.variety;
}

export function getPaddyProcessStockTypeLabel(
  process: Pick<PaddyProcess, "stockSourceType">,
  t: TFunction,
) {
  if (isPaddyProcessFromStoreSource(process.stockSourceType)) {
    return t(`common:${process.stockSourceType}`);
  }

  return process.stockSourceType === "farmer"
    ? t("common:farmer_owned")
    : t("common:company_owned");
}

export function getPaddyProcessSourceBillNo(process: PaddyProcess) {
  return (
    process.sourceCompanyPaddyWarehouse?.billNo ??
    process.sourceFarmerPaddyWarehouse?.billNo ??
    "-"
  );
}

export function getPaddyProcessOwnerName(process: PaddyProcess) {
  return (
    process.sourceCompanyPaddyWarehouse?.ownerName ??
    process.sourceFarmerPaddyWarehouse?.ownerName ??
    "-"
  );
}
