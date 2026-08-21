import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TFunction } from "i18next";
import type { PaddyProcess } from "../schemas/paddy-process";

const STORE_OUTPUT_KEYS = [
  "regection",
  "short_green",
  "broken_rice",
  "waste",
] as const;

type PaddyProcessStatusBadgesProps = {
  process: PaddyProcess;
  t: TFunction;
  compact?: boolean;
};

export function PaddyProcessStatusBadges({
  process,
  t,
  compact = false,
}: PaddyProcessStatusBadgesProps) {
  const isCompleted = process.status === "process_completed";
  const isUnderProcess = process.status === "under_process";

  return (
    <div className={cn("flex flex-wrap gap-1.5", compact ? "max-w-[280px]" : undefined)}>
      {isUnderProcess ? (
        <Badge className="border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-100">
          {t("common:under_process")}
        </Badge>
      ) : null}
      {isCompleted ? (
        <Badge className="border-emerald-300 bg-emerald-100 text-emerald-950 hover:bg-emerald-100">
          {t("common:process_completed")}
        </Badge>
      ) : null}
      {process.riceExtracted ? (
        <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-900">
          {t("common:rice_extracted")}
        </Badge>
      ) : null}
      {STORE_OUTPUT_KEYS.map((storeType) =>
        process.storeOutputs?.[storeType] ? (
          <Badge
            key={storeType}
            variant="outline"
            className="border-violet-300 bg-violet-50 text-violet-900"
          >
            {t(`common:${storeType}`)}
          </Badge>
        ) : null,
      )}
    </div>
  );
}
