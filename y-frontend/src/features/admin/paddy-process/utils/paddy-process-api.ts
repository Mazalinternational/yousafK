import type {
  PaddyProcessFormValues,
  PaddyProcessFromStoreFormValues,
} from "../schemas/paddy-process";
import { PADDY_PROCESS_FROM_STORE_TYPES } from "../schemas/paddy-process";

export function toPaddyProcessCreatePayload(
  values: PaddyProcessFormValues | PaddyProcessFromStoreFormValues,
) {
  if ("variety" in values) {
    return {
      variety: values.variety,
      stockSourceType: values.stockSourceType,
      date: values.date,
      weight: values.weight,
      unit: values.unit,
    };
  }

  return {
    stockSourceType: values.stockSourceType,
    date: values.date,
    weight: values.weight,
    unit: values.unit,
  };
}

export function isPaddyProcessFromStoreSource(
  stockSourceType: string,
): stockSourceType is PaddyProcessFromStoreFormValues["stockSourceType"] {
  return PADDY_PROCESS_FROM_STORE_TYPES.includes(
    stockSourceType as PaddyProcessFromStoreFormValues["stockSourceType"],
  );
}
