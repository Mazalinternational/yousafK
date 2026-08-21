import { useActiveSeason } from "./useActiveSeason";
import { useSeasonScope } from "../SeasonScopeProvider";

/**
 * Active season (writes) + selected view season (reads) in one hook.
 * Use `canWriteInSelectedSeason` to gate create/edit when browsing closed seasons.
 */
export function useSeasonWriteAccess() {
  const { data: activeSeason, isLoading: isLoadingActiveSeason } = useActiveSeason();
  const { selectedSeasonId, activeSeasonId } = useSeasonScope();

  const canWriteInSelectedSeason =
    Boolean(selectedSeasonId) && selectedSeasonId === activeSeasonId;

  return {
    activeSeason: activeSeason ?? null,
    isLoadingActiveSeason,
    selectedSeasonId,
    activeSeasonId,
    canWriteInSelectedSeason,
    canCreate: Boolean(activeSeason) && canWriteInSelectedSeason,
  };
}
