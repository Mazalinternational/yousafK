import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { dateFormatter } from "@/utils/dataFormatters";

type SeasonLike = {
  name: string;
  status: "ACTIVE" | "CLOSED" | string;
  startDate: string;
  endDate?: string | null;
};

export function DashboardSeasonBanner({
  season,
  t,
  accentClassName = "border-l-violet-500",
  emptyHint,
}: {
  season: SeasonLike | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, options?: any) => string;
  accentClassName?: string;
  emptyHint?: ReactNode;
}) {
  if (!season) {
    return emptyHint ? <>{emptyHint}</> : null;
  }

  return (
    <Card className={cn("border-l-4 py-0", accentClassName)}>
      <CardHeader className="gap-1 px-4 py-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
          <span>{season.name}</span>
          <Badge variant={season.status === "ACTIVE" ? "default" : "secondary"}>
            {t(`common:${season.status === "ACTIVE" ? "active" : "closed"}`)}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          {t("common:current_season_range", {
            startDate: dateFormatter(season.startDate),
            endDate: season.endDate ? dateFormatter(season.endDate) : t("common:ongoing"),
          })}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export function DashboardKpiCard({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card className="py-0 shadow-none">
      <CardHeader className="gap-0.5 px-3 py-2.5">
        <CardDescription className="text-[11px] leading-none">{label}</CardDescription>
        <CardTitle className={cn("text-base leading-tight tabular-nums", valueClassName)}>
          {value}
        </CardTitle>
        {hint ? (
          <p className="text-[10px] leading-snug text-muted-foreground">{hint}</p>
        ) : null}
      </CardHeader>
    </Card>
  );
}

export function DashboardChartCard({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="py-0 shadow-none">
      <CardHeader className="gap-0.5 px-4 pb-0 pt-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3 pt-1">{children}</CardContent>
    </Card>
  );
}
