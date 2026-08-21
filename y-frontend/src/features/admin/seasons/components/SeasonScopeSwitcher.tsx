import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/hooks/useAuth";
import CustomSelect from "@/components/custom-select";
import { useSeasonScope } from "../SeasonScopeProvider";
import { useSeasons } from "../hooks/useSeasons";
import { useActiveSeason } from "../hooks/useActiveSeason";

export function SeasonScopeSwitcher() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const canReadSeasons = can("seasons.read");
  const { selectedSeasonId, activeSeasonId, setSelectedSeasonId } = useSeasonScope();
  const { data: seasonsData } = useSeasons({
    pageNumber: 1,
    pageSize: 100,
    sortBy: "createdAt",
    sortByAction: "desc",
  });
  const { data: activeSeason } = useActiveSeason();

  const seasonItems = seasonsData?.items ?? [];
  const seasonOptions = useMemo(
    () =>
      seasonItems.map((season) => ({
        value: season.id,
        label: `${season.name} (${season.status === "ACTIVE" ? t("common:active") : t("common:closed")})`,
      })),
    [seasonItems, t],
  );
  const selectedSeason = useMemo(
    () => seasonItems.find((item) => item.id === selectedSeasonId) ?? null,
    [seasonItems, selectedSeasonId],
  );
  const selectedLabel = selectedSeason?.name ?? t("common:season_scope_none");
  const isReadOnlyScope =
    Boolean(selectedSeasonId) &&
    Boolean(activeSeasonId) &&
    selectedSeasonId !== activeSeasonId;

  if (!canReadSeasons) {
    return null;
  }

  return (
    <div className="rounded-md border bg-sidebar-accent/30 p-2 text-xs">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{t("common:season_scope_title")}</span>
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-medium ${
            isReadOnlyScope
              ? "bg-amber-100 text-amber-900"
              : "bg-emerald-100 text-emerald-900"
          }`}
        >
          {isReadOnlyScope
            ? t("common:season_scope_read_only")
            : t("common:season_scope_write_enabled")}
        </span>
      </div>
      <CustomSelect
        value={selectedSeasonId}
        options={seasonOptions}
        placeholder={t("common:season_scope_select_placeholder")}
        onChange={(value) => setSelectedSeasonId(value)}
      />
      <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
        <div>
          <span className="font-medium text-foreground/80">{t("common:season_scope_viewing")}:</span>{" "}
          {selectedLabel}
        </div>
        <div>
          <span className="font-medium text-foreground/80">{t("common:season_scope_active")}:</span>{" "}
          {activeSeason?.name ?? t("common:season_scope_none")}
        </div>
      </div>
      <div className="sr-only">{selectedLabel}</div>
    </div>
  );
}
