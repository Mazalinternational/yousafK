import type { PaddyProcess } from "../schemas/paddy-process";
import type { StoreType } from "../../store/schemas/store";

export function isPaddyProcessCompleted(paddyProcess: PaddyProcess) {
  return paddyProcess.status === "process_completed";
}

export function canAddProcessOutputs(paddyProcess: PaddyProcess) {
  return isPaddyProcessCompleted(paddyProcess);
}

export function hasStoreOutput(paddyProcess: PaddyProcess, storeType: StoreType) {
  return Boolean(paddyProcess.storeOutputs?.[storeType]);
}

export const OUTPUT_HIGHLIGHT_CLASS = "font-semibold text-emerald-700 focus:text-emerald-700";
