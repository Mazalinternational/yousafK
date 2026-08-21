import { useMemo } from "react";
import type { ApiVarietyKind } from "../schemas/variety";
import { useVarieties } from "./useVarieties";

export type VarietySelectOption = { value: string; label: string };

/**
 * Active catalog rows as select options. Stored values use the variety **name**
 * (matches backend `resolveActiveVarietyName` and existing stock keys).
 */
export function useVarietySelectOptions(kind: ApiVarietyKind, pageSize = 500) {
  const { data, isLoading, isFetching, error } = useVarieties(kind, {
    pageNumber: 1,
    pageSize,
    sortBy: "name",
    sortDirection: "asc",
  });

  const options: VarietySelectOption[] = useMemo(() => {
    return (data?.items ?? [])
      .filter((v) => v.isActive)
      .map((v) => {
        const name = v.name.trim();
        const code = v.code.trim();
        const same =
          name.localeCompare(code, undefined, { sensitivity: "accent" }) === 0;
        return {
          value: name,
          label: same ? name : `${name} (${code})`,
        };
      });
  }, [data?.items]);

  return {
    options,
    isLoading: isLoading || isFetching,
    error,
    isEmpty: !isLoading && !isFetching && options.length === 0,
  };
}
